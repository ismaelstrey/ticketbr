import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EvolutionConversation } from "@/server/services/evolution-service";
import { evolutionIsConfigured, fetchConversationsFromEvolution } from "@/server/services/evolution-service";
import { fetchConversationsFromN8n, isN8nConfigured } from "@/server/services/n8n-adapter";
import { ChatContact } from "@/types/chat";
import { resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";
import { fetchConversationsFromUazapi, uazapiIsConfigured } from "@/server/services/uazapi-service";

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

function toContact(
  conversation: EvolutionConversation | ChatContact,
  provider: string
): ChatContact {
  const normalized = toConversationView(conversation);
  const tags = Array.isArray((conversation as any).tags) ? (conversation as any).tags.map(String) : [];
  const baseTags = tags.length ? tags : ["WhatsApp"];
  if (!baseTags.includes(provider)) baseTags.push(provider);
  if (!baseTags.includes("WhatsApp")) baseTags.push("WhatsApp");

  return {
    id: normalized.id,
    name: normalized.name,
    company: (conversation as any).company ?? "Sem empresa",
    email: normalized.email,
    phone: normalized.phone,
    tags: baseTags,
    hasWhatsApp: true,
    conversationId: normalized.conversationId,
    lastMessagePreview: normalized.lastMessagePreview,
    lastMessageAt: normalized.lastMessageAt
  };
}

export async function GET(request: NextRequest) {
  try {
    const config = await resolveWhatsAppConfig(request);

    const funcionarios = await prisma.funcionario.findMany({
      where: {
        solicitante: {
          status: true
        }
      },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        remoteJid: true,
        whatsappId: true,
        solicitante: {
          select: {
            id: true,
            nome_fantasia: true,
            razao_social: true
          }
        }
      }
    });

    const baseContacts: ChatContact[] = funcionarios.map((f) => {
      const tags = inferTags(f.nome);
      if (f.remoteJid || f.whatsappId) tags.push("WhatsApp");
      if (f.email) tags.push("Email");

      return {
        id: f.id,
        name: f.nome,
        company: f.solicitante?.nome_fantasia || f.solicitante?.razao_social || "Sem empresa",
        companyId: f.solicitante?.id,
        email: f.email ?? undefined,
        phone: f.telefone,
        tags,
        hasWhatsApp: Boolean(f.remoteJid || f.whatsappId),
        conversationId: f.remoteJid || (f.telefone ? `${onlyDigits(f.telefone)}@s.whatsapp.net` : undefined),
        lastMessagePreview: undefined,
        lastMessageAt: undefined
      };
    });

    const provider = config?.whatsappProvider || (uazapiIsConfigured(config) ? "uazapi" : evolutionIsConfigured(config) ? "evolution" : "n8n");

    const conversations = provider === "uazapi"
      ? (uazapiIsConfigured(config)
        ? await fetchConversationsFromUazapi(config).catch((error) => {
            console.warn("UAZAPI fetch conversations failed", error);
            return [];
          })
        : [])
      : provider === "evolution"
        ? (evolutionIsConfigured(config)
          ? await fetchConversationsFromEvolution(config).catch((error) => {
              console.warn("Evolution fetch conversations failed", error);
              return [];
            })
          : [])
        : (isN8nConfigured(config)
          ? await fetchConversationsFromN8n(config).catch((error) => {
              console.warn("n8n fetch conversations failed", error);
              return [];
            })
          : []);

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
        matched.hasWhatsApp = true;
      }
    }

    baseContacts.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));

    return NextResponse.json({ data: baseContacts });
  } catch (error) {
    console.error("Error loading chat contacts", error);
    return NextResponse.json({ error: "Erro ao carregar contatos" }, { status: 500 });
  }
}
