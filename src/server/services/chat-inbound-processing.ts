import { appendMessage } from "@/server/services/chat-memory";
import { createChatMessageReceivedEvent } from "@/server/contracts/ticket-chat-events";
import { chatService } from "@/server/services/chat-service";
import type { NormalizedInboundResult } from "@/server/services/chat-inbound-normalizer";
import { emitChatEventToN8n } from "@/server/services/n8n-adapter";
import { syncConversationMessageStatus, upsertInboundConversation } from "@/server/services/chat-conversation-store";

function buildAttachment(payload: Extract<NormalizedInboundResult, { kind: "message" }>['payload']) {
  if (!payload.message.media?.url) return undefined;
  return {
    url: payload.message.media.url,
    mimeType: payload.message.media.mimetype,
    name: payload.message.type
  };
}

export async function processNormalizedInboundEvent(normalized: NormalizedInboundResult) {
  if (normalized.kind === "ignored") {
    return { ok: true, ignored: true, reason: normalized.reason, source: normalized.source };
  }

  if (normalized.kind === "message_update") {
    await chatService.updateMessageStatus(normalized.statusUpdate.waMessageId, normalized.statusUpdate.status);
    await syncConversationMessageStatus(normalized.statusUpdate.waMessageId, normalized.statusUpdate.status);
    return { ok: true, kind: normalized.kind, source: normalized.source };
  }

  const inbound = await chatService.processInboundMessage(normalized.payload);

  if (inbound.isDuplicate) {
    return { ok: true, kind: normalized.kind, source: normalized.source, deduplicated: true };
  }

  await upsertInboundConversation(normalized);

  if (!normalized.payload.fromMe) {
    appendMessage({
      id: crypto.randomUUID(),
      contactId: normalized.payload.wa_chat_id,
      channel: "whatsapp",
      direction: "in",
      text: normalized.payload.message.text || normalized.payload.message.caption || "Mensagem recebida",
      createdAt: new Date().toISOString(),
      attachment: buildAttachment(normalized.payload)
    });
  }

  await emitChatEventToN8n(
    createChatMessageReceivedEvent({
      provider: normalized.payload.provider,
      mode: normalized.payload.mode,
      event: normalized.payload.event,
      instance: normalized.payload.instance,
      waChatId: normalized.payload.wa_chat_id,
      waMessageId: normalized.payload.wa_message_id,
      fromMe: normalized.payload.fromMe,
      pushName: normalized.payload.pushName,
      timestamp: normalized.payload.timestamp,
      message: normalized.payload.message,
      raw: normalized.payload.raw,
      correlation: {
        waChatId: normalized.payload.wa_chat_id,
        waMessageId: normalized.payload.wa_message_id,
      },
    }),
  );

  return { ok: true, kind: normalized.kind, source: normalized.source };
}
