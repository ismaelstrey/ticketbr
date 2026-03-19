import type { InboundPayload } from "@/server/services/chat-service";

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

function asNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string" && input.trim()) {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function normalizeMessageType(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "conversation") return "text";
  return normalized;
}

function resolveMedia(message: Record<string, unknown>) {
  const image = asRecord(message.image);
  const video = asRecord(message.video);
  const audio = asRecord(message.audio);
  const document = asRecord(message.document);
  const sticker = asRecord(message.sticker);
  const candidates = [image, video, audio, document, sticker];

  for (const candidate of candidates) {
    const url = firstNonEmpty(candidate.url, candidate.media, candidate.link);
    const mimetype = firstNonEmpty(candidate.mimetype, candidate.mimeType, candidate.mime);
    if (url) {
      return {
        url,
        mimetype: mimetype || "application/octet-stream"
      };
    }
  }

  return null;
}

function resolveMessageType(message: Record<string, unknown>) {
  return normalizeMessageType(firstNonEmpty(
    message.type,
    message.messageType,
    message.mediaType,
    message.mediatype,
    message.image ? "image" : "",
    message.video ? "video" : "",
    message.audio ? "audio" : "",
    message.document ? "document" : "",
    message.sticker ? "sticker" : "",
    "text"
  ));
}

function resolveText(message: Record<string, unknown>) {
  return firstNonEmpty(
    message.text,
    message.caption,
    message.body,
    message.content,
    message.conversation,
    asRecord(message.extendedTextMessage).text,
    asRecord(message.image).caption,
    asRecord(message.video).caption,
    asRecord(message.document).caption
  ) || null;
}

export type ParsedUazapiWebhook = {
  kind: "message" | "message_update" | "ignored";
  payload?: InboundPayload;
  statusUpdate?: { waMessageId: string; status: string };
  reason?: string;
};

export function parseUazapiWebhookPayload(input: unknown): ParsedUazapiWebhook {
  const root = asRecord(input);
  const data = asRecord(root.data);
  const rootMessage = asRecord(root.message);
  const dataMessage = asRecord(data.message);
  const message = Object.keys(rootMessage).length ? rootMessage : dataMessage;
  const chat = asRecord(root.chat);

  const event = firstNonEmpty(root.EventType, root.event, root.type).toLowerCase();
  const eventName = event || "message";
  const instance = firstNonEmpty(root.instanceName, root.instance, data.instance, data.owner, root.sender) || "default";
  const chatId = firstNonEmpty(message.chatid, message.chatId, chat.wa_chatid, data.chatid, data.chatId, data.remoteJid, data.sender, data.from);
  const messageId = firstNonEmpty(message.messageid, message.messageId, message.id, data.messageid, data.messageId, data.id);
  const timestamp = asNumber(message.messageTimestamp ?? message.timestamp ?? chat.wa_lastMsgTimestamp ?? data.messageTimestamp ?? data.timestamp ?? root.timestamp);
  const fromMe = Boolean(message.fromMe ?? data.fromMe ?? data.from_me ?? false);
  const pushName = firstNonEmpty(message.senderName, chat.wa_contactName, chat.name, data.senderName, data.pushName, data.notifyName, data.name) || null;

  if (eventName === "messages_update" || eventName === "message_update" || eventName === "status") {
    const status = firstNonEmpty(message.status, data.status, data.messageStatus, data.state);
    if (messageId && status) {
      return {
        kind: "message_update",
        statusUpdate: {
          waMessageId: messageId,
          status
        }
      };
    }
    return { kind: "ignored", reason: "status event without identifiable message" };
  }

  if (eventName !== "message" && eventName !== "messages") {
    return { kind: "ignored", reason: `event ${eventName} não requer ingestão de mensagem` };
  }

  if (!chatId || !messageId) {
    return { kind: "ignored", reason: "payload sem chatId ou messageId" };
  }

  const text = resolveText(message);
  const media = resolveMedia(message);

  return {
    kind: "message",
    payload: {
      provider: "uazapi",
      mode: "rest",
      event: eventName,
      instance,
      wa_chat_id: chatId,
      wa_message_id: messageId,
      fromMe,
      pushName,
      timestamp,
      message: {
        type: resolveMessageType(message),
        text,
        caption: firstNonEmpty(message.caption, asRecord(message.image).caption, asRecord(message.video).caption, asRecord(message.document).caption) || null,
        media
      },
      raw: input
    }
  };
}
