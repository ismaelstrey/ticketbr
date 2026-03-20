import type { InboundPayload } from "@/server/services/chat-service";
import { parseUazapiWebhookPayload } from "@/server/services/uazapi-webhook";

function asRecord(input: unknown): Record<string, any> {
  return input && typeof input === "object" ? (input as Record<string, any>) : {};
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeLegacyInboundEnvelope(item: unknown): InboundPayload | null {
  const root = asRecord(item);
  const bodyData = asRecord(root.raw).body?.data;
  const messageData = asRecord(bodyData);
  const key = asRecord(messageData.key);
  const message = asRecord(messageData.message);

  if (!key.remoteJid || !key.id) return null;

  return {
    provider: firstText(root.provider, bodyData?.provider, "evolution") || "evolution",
    mode: firstText(root.mode, "baileys") || "baileys",
    event: firstText(root.event, "message") || "message",
    instance: firstText(root.instance, bodyData?.instance, "default") || "default",
    wa_chat_id: String(key.remoteJid),
    wa_message_id: String(key.id),
    fromMe: Boolean(key.fromMe),
    pushName: firstText(messageData.pushName, bodyData?.pushName),
    timestamp: asNumber(messageData.messageTimestamp),
    message: {
      type: firstText(messageData.messageType, message.imageMessage ? "image" : "text") || "text",
      text: firstText(
        message.conversation,
        asRecord(message.extendedTextMessage).text,
        asRecord(message.imageMessage).caption
      ),
      caption: firstText(asRecord(message.imageMessage).caption),
      media: null
    },
    raw: item
  };
}

export type NormalizedInboundResult =
  | { kind: "message"; payload: InboundPayload; source: string }
  | { kind: "message_update"; statusUpdate: { waMessageId: string; status: string }; source: string }
  | { kind: "ignored"; reason: string; source: string };

export function normalizeInboundPayload(input: unknown): NormalizedInboundResult {
  const root = Array.isArray(input) ? input[0] : input;
  const payload = asRecord(root);
  const explicitProvider = firstText(payload.provider, payload.source, payload.eventSource)?.toLowerCase();

  if (explicitProvider === "uazapi" || payload.EventType || payload.instanceName) {
    const parsed = parseUazapiWebhookPayload(root);
    if (parsed.kind === "message" && parsed.payload) {
      return { kind: "message", payload: parsed.payload, source: "uazapi" };
    }
    if (parsed.kind === "message_update" && parsed.statusUpdate) {
      return { kind: "message_update", statusUpdate: parsed.statusUpdate, source: "uazapi" };
    }
    return { kind: "ignored", reason: parsed.reason ?? "ignored", source: "uazapi" };
  }

  const normalizedLegacy = normalizeLegacyInboundEnvelope(root);
  if (normalizedLegacy) {
    return { kind: "message", payload: normalizedLegacy, source: String(normalizedLegacy.provider || "legacy-webhook") };
  }

  if (payload.wa_chat_id && payload.wa_message_id) {
    return {
      kind: "message",
      payload: payload as InboundPayload,
      source: String(explicitProvider || payload.provider || "webhook")
    };
  }

  return {
    kind: "ignored",
    reason: "payload sem estrutura reconhecida de mensagem inbound",
    source: String(explicitProvider || payload.provider || "webhook")
  };
}
