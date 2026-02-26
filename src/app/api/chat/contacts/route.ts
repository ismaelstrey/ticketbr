import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EvolutionConversation } from "@/server/services/evolution-service";
import { evolutionIsConfigured, fetchConversationsFromEvolution } from "@/server/services/evolution-service";
import { fetchConversationsFromN8n, isN8nConfigured } from "@/server/services/n8n-adapter";
import { ChatContact } from "@/types/chat";
import { resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";

function inferTags(name: string) {
  const tags: string[] = [];
  if (/vip|premium|ouro/i.test(name)) tags.push("VIP");
  if (/internet|net|telecom/i.test(name)) tags.push("ISP");
  if (tags.length === 0) tags.push("Cliente");
  return tags;
}

function onlyDigits(input?: string) {
  return (input ?? "").replace(/\D/g, "");
}

function toConversationView(
  conversation: EvolutionConversation | ChatContact
): Pick<ChatContact, "id" | "name" | "phone" | "email" | "conversationId" | "lastMessagePreview" | "lastMessageAt"> {
  if ("number" in conversation) {
    return {
      id: `wa:${conversation.number}`,
      name: conversation.name || conversation.number,
      phone: conversation.number,
      email: undefined,
      conversationId: conversation.id,
      lastMessagePreview: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt
    };
  }

  return {
    id: conversation.id,
    name: conversation.name,
    phone: conversation.phone,
    email: conversation.email,
    conversationId: conversation.conversationId || conversation.id,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAt: conversation.lastMessageAt
  };
}

export async function GET(request: NextRequest) {
  try {
    const config = await resolveWhatsAppConfig(request);

    const contacts = await prisma.solicitante.findMany({
      where: { status: true },
      orderBy: { nome_fantasia: "asc" },
      select: {
        id: true,
        nome_fantasia: true,
        razao_social: true,
        email: true,
        telefone: true
      }
    });

    const baseContacts: ChatContact[] = contacts.map((c) => ({
      id: c.id,
      name: c.nome_fantasia,
      company: c.razao_social,
      email: c.email,
      phone: c.telefone,
      tags: inferTags(c.nome_fantasia),
      conversationId: c.telefone ? `${onlyDigits(c.telefone)}@s.whatsapp.net` : undefined,
      lastMessagePreview: undefined,
      lastMessageAt: undefined
    }));

    const conversations = isN8nConfigured(config)
      ? await fetchConversationsFromN8n(config).catch((error) => {
        console.warn("n8n fetch conversations failed", error);
        return [];
      })
      : evolutionIsConfigured(config)
        ? await fetchConversationsFromEvolution(config).catch((error) => {
          console.warn("Evolution fetch conversations failed", error);
          return [];
        })
        : [];

    if (conversations.length === 0) {
      return NextResponse.json({ data: baseContacts });
    }

    const byPhone = new Map(baseContacts.map((c) => [onlyDigits(c.phone), c]));

    for (const conversation of conversations) {
      const normalized = toConversationView(conversation);
      const conversationPhone = onlyDigits(normalized.phone);
      const matched = byPhone.get(conversationPhone);
      if (matched) {
        matched.conversationId = normalized.conversationId;
        matched.lastMessagePreview = normalized.lastMessagePreview;
        matched.lastMessageAt = normalized.lastMessageAt;
        const currentTags = matched.tags ?? [];
        if (!currentTags.includes("WhatsApp")) currentTags.push("WhatsApp");
        matched.tags = currentTags;
      } else {
        baseContacts.push({
          id: normalized.id,
          name: normalized.name,
          company: "Sem empresa",
          phone: normalized.phone,
          email: normalized.email,
          tags: ["WhatsApp"],
          conversationId: normalized.conversationId,
          lastMessagePreview: normalized.lastMessagePreview,
          lastMessageAt: normalized.lastMessageAt
        });
      }
    }

    baseContacts.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));

    return NextResponse.json({ data: baseContacts });
  } catch (error) {
    console.error("Error loading chat contacts", error);
    return NextResponse.json({ error: "Erro ao carregar contatos" }, { status: 500 });
  }
}
