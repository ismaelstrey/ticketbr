import type { Prisma } from "../../../prisma/generated/client.ts";
import { prisma } from "@/lib/prisma";
import type { ChatMessage } from "@/types/chat";
import type { NormalizedInboundResult } from "@/server/services/chat-inbound-normalizer";

interface StoredChatMessage extends ChatMessage {
  status?: string;
}

function buildInboundChatMessage(normalized: Extract<NormalizedInboundResult, { kind: "message" }>): ChatMessage {
  return {
    id: normalized.payload.wa_message_id,
    contactId: normalized.payload.wa_chat_id,
    channel: "whatsapp",
    direction: normalized.payload.fromMe ? "out" : "in",
    text: normalized.payload.message.text || normalized.payload.message.caption || undefined,
    attachment: normalized.payload.message.media?.url
      ? {
          url: normalized.payload.message.media.url,
          mimeType: normalized.payload.message.media.mimetype,
          name: normalized.payload.message.type
        }
      : undefined,
    createdAt: normalized.payload.timestamp
      ? new Date(normalized.payload.timestamp).toISOString()
      : new Date().toISOString()
  };
}

function normalizeStoredMessages(input: unknown): StoredChatMessage[] {
  return Array.isArray(input) ? input as StoredChatMessage[] : [];
}

function toJsonMessages(messages: StoredChatMessage[]): Prisma.InputJsonValue {
  return messages as unknown as Prisma.InputJsonValue;
}

export async function upsertInboundConversation(normalized: Extract<NormalizedInboundResult, { kind: "message" }>) {
  const conversationId = normalized.payload.wa_chat_id;
  const message = buildInboundChatMessage(normalized);

  const existing = await prisma.chatConversation.findFirst({
    where: {
      contactId: normalized.payload.wa_chat_id,
      channel: "whatsapp",
      conversationId,
      finalized: false
    },
    orderBy: { closedAt: "desc" }
  });

  if (!existing) {
    return prisma.chatConversation.create({
      data: {
        contactId: normalized.payload.wa_chat_id,
        contactName: normalized.payload.pushName || normalized.payload.wa_chat_id,
        channel: "whatsapp",
        conversationId,
        messages: toJsonMessages([message]),
        finalized: false,
        createdBy: "Webhook",
        closedAt: new Date(message.createdAt)
      }
    });
  }

  const messages = normalizeStoredMessages(existing.messages);
  const nextMessages = messages.some((item) => item.id === message.id)
    ? messages.map((item) => (item.id === message.id ? { ...item, ...message } : item))
    : [...messages, message];

  return prisma.chatConversation.update({
    where: { id: existing.id },
    data: {
      contactName: normalized.payload.pushName || existing.contactName,
      messages: toJsonMessages(nextMessages),
      closedAt: new Date(message.createdAt)
    }
  });
}

export async function syncConversationMessageStatus(waMessageId: string, status: string) {
  const conversations = await prisma.chatConversation.findMany({
    where: {
      channel: "whatsapp"
    },
    orderBy: { closedAt: "desc" },
    take: 50
  });

  for (const conversation of conversations) {
    const messages = normalizeStoredMessages(conversation.messages);
    const index = messages.findIndex((message) => message.id === waMessageId);
    if (index === -1) continue;

    const updatedMessages = [...messages];
    updatedMessages[index] = {
      ...updatedMessages[index],
      status
    };

    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        messages: toJsonMessages(updatedMessages),
        closedAt: new Date()
      }
    });
    return true;
  }

  return false;
}
