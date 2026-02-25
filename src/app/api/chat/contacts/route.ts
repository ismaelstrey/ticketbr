import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evolutionIsConfigured, fetchConversationsFromEvolution } from "@/server/services/evolution-service";
import { ChatContact } from "@/types/chat";
import { getWhatsAppConfigFromRequest } from "@/server/services/whatsapp-settings";

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

export async function GET(request: NextRequest) {
  try {
    const config = getWhatsAppConfigFromRequest(request);

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

    if (!evolutionIsConfigured(config)) {
      return NextResponse.json({ data: baseContacts });
    }

    const conversations = await fetchConversationsFromEvolution(config);
    const byPhone = new Map(baseContacts.map((c) => [onlyDigits(c.phone), c]));

    for (const conversation of conversations) {
      const matched = byPhone.get(conversation.number);
      if (matched) {
        matched.conversationId = conversation.id;
        matched.lastMessagePreview = conversation.lastMessage;
        matched.lastMessageAt = conversation.lastMessageAt;
        const currentTags = matched.tags ?? [];
        if (!currentTags.includes("WhatsApp")) currentTags.push("WhatsApp");
        matched.tags = currentTags;
      } else {
        baseContacts.push({
          id: `wa:${conversation.number}`,
          name: conversation.name || conversation.number,
          company: "Sem empresa",
          phone: conversation.number,
          email: undefined,
          tags: ["WhatsApp"],
          conversationId: conversation.id,
          lastMessagePreview: conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt
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
