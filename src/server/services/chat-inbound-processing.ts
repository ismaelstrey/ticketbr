import { appendMessage } from "@/server/services/chat-memory";
import { chatService } from "@/server/services/chat-service";
import type { NormalizedInboundResult } from "@/server/services/chat-inbound-normalizer";
import { emitChatEventToN8n } from "@/server/services/n8n-adapter";

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
    return { ok: true, kind: normalized.kind, source: normalized.source };
  }

  await chatService.processInboundMessage(normalized.payload);

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

  await emitChatEventToN8n({
    type: "chat.message.received",
    source: "ticketbr-chat",
    occurredAt: new Date().toISOString(),
    data: normalized.payload as unknown as Record<string, unknown>
  });

  return { ok: true, kind: normalized.kind, source: normalized.source };
}
