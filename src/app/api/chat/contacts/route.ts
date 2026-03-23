import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EvolutionConversation } from "@/server/services/evolution-service";
import { fetchConversationsFromEvolution } from "@/server/services/evolution-service";
import { fetchConversationsFromN8n } from "@/server/services/n8n-adapter";
import { ChatContact } from "@/types/chat";
import { resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";
import { fetchConversationsFromUazapi } from "@/server/services/uazapi-service";
import { resolveWhatsAppProvider } from "@/server/services/chat-provider";

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

function compareContactsByPriority(a: Pick<ChatContact, "hasOpenConversation" | "lastMessageAt" | "name">, b: Pick<ChatContact, "hasOpenConversation" | "lastMessageAt" | "name">) {
  if (Boolean(a.hasOpenConversation) !== Boolean(b.hasOpenConversation)) {
    return Number(Boolean(b.hasOpenConversation)) - Number(Boolean(a.hasOpenConversation));
  }

  const byLastMessage = String(b.lastMessageAt || "").localeCompare(String(a.lastMessageAt || ""));
  if (byLastMessage !== 0) return byLastMessage;

  return a.name.localeCompare(b.name, "pt-BR");
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

    const openConversations = await prisma.chatConversation.findMany({
      where: { finalized: false },
      select: {
        contactId: true,
        channel: true,
        conversationId: true
      }
    });

    const openConversationKeys = new Set<string>();
    for (const conversation of openConversations) {
      const rawContactId = String(conversation.contactId || "");
      const rawConversationId = String(conversation.conversationId || "");
      if (rawContactId) {
        openConversationKeys.add(`${conversation.channel}:${rawContactId}`);
        const contactDigits = onlyDigits(rawContactId);
        if (contactDigits) openConversationKeys.add(`${conversation.channel}:${contactDigits}`);
      }
      if (rawConversationId) {
        openConversationKeys.add(`${conversation.channel}:${rawConversationId}`);
      }
    }

    const hasOpenConversation = (
      channel: "whatsapp" | "email",
      identifiers: Array<string | null | undefined>
    ) => identifiers.some((value) => {
      const raw = String(value || "").trim();
      if (!raw) return false;
      if (openConversationKeys.has(`${channel}:${raw}`)) return true;
      const digits = onlyDigits(raw);
      return digits ? openConversationKeys.has(`${channel}:${digits}`) : false;
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
        lastMessageAt: undefined,
        hasOpenConversation: hasOpenConversation("whatsapp", [f.remoteJid, f.telefone, f.whatsappId])
          || hasOpenConversation("email", [f.email])
      };
    });

    const provider = resolveWhatsAppProvider(config, ["uazapi", "evolution", "n8n"]);

    const conversations = provider === "uazapi"
      ? await fetchConversationsFromUazapi(config).catch((error) => {
          console.warn("UAZAPI fetch conversations failed", error);
          return [];
        })
      : provider === "evolution"
        ? await fetchConversationsFromEvolution(config).catch((error) => {
            console.warn("Evolution fetch conversations failed", error);
            return [];
          })
        : provider === "n8n"
          ? await fetchConversationsFromN8n(config).catch((error) => {
              console.warn("n8n fetch conversations failed", error);
              return [];
            })
          : [];

    if (conversations.length === 0) {
      baseContacts.sort(compareContactsByPriority);
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
        matched.hasOpenConversation = matched.hasOpenConversation || hasOpenConversation("whatsapp", [normalized.conversationId, normalized.phone, matched.phone]);
      }
    }

    baseContacts.sort(compareContactsByPriority);

    return NextResponse.json({ data: baseContacts });
  } catch (error) {
    console.error("Error loading chat contacts", error);
    return NextResponse.json({ error: "Erro ao carregar contatos" }, { status: 500 });
  }
}
