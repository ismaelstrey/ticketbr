import { ChatContact, ChatMessage } from "@/types/chat";
import { WhatsAppRuntimeConfig } from "@/server/services/whatsapp-settings";

export interface ChatEventPayload {
  type: string;
  source: "ticketbr-chat";
  occurredAt: string;
  data: Record<string, unknown>;
}

function resolveWebhook(config?: WhatsAppRuntimeConfig | null) {
  return config?.n8nWebhookUrl || process.env.N8N_CHAT_WEBHOOK_URL || "";
}

function resolveN8nBase(config?: WhatsAppRuntimeConfig | null) {
  return config?.n8nBaseUrl || process.env.N8N_CHAT_BASE_URL || "";
}

function resolvePath(config: WhatsAppRuntimeConfig | null | undefined, key: "conversations" | "messages" | "send") {
  if (key === "conversations") return config?.n8nConversationsPath || "/conversations";
  if (key === "messages") return config?.n8nMessagesPath || "/messages";
  return config?.n8nSendPath || "/send";
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizePhone(value?: string) {
  return (value ?? "").replace(/\D/g, "");
}

function buildUrl(base: string, pathOrUrl: string) {
  if (isAbsoluteUrl(pathOrUrl)) return pathOrUrl;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function requestN8n(pathOrUrl: string, config?: WhatsAppRuntimeConfig | null, init?: RequestInit) {
  const base = resolveN8nBase(config);
  if (!base && !isAbsoluteUrl(pathOrUrl)) {
    throw new Error("n8n não configurado. Defina n8nBaseUrl nas configurações.");
  }

  const url = buildUrl(base, pathOrUrl);
  const apiKey = config?.n8nApiKey || process.env.N8N_CHAT_API_KEY;

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...init?.headers
    }
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || json?.error || `n8n request failed (${response.status})`);
  }
  return json;
}

export function isN8nConfigured(config?: WhatsAppRuntimeConfig | null) {
  return Boolean(resolveWebhook(config) || resolveN8nBase(config));
}

export async function fetchConversationsFromN8n(config?: WhatsAppRuntimeConfig | null): Promise<ChatContact[]> {
  if (!isN8nConfigured(config)) return [];

  const path = resolvePath(config, "conversations");
  const payload = await requestN8n(path, config, { method: "GET" });
  const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  return list.map((item: any) => ({
    id: String(item.id ?? item.contactId ?? `wa:${normalizePhone(item.phone)}`),
    name: String(item.name ?? item.contactName ?? item.phone ?? "Contato"),
    phone: normalizePhone(item.phone ?? item.number ?? "") || undefined,
    email: typeof item.email === "string" ? item.email : undefined,
    company: typeof item.company === "string" ? item.company : undefined,
    tags: Array.isArray(item.tags) ? item.tags.map(String) : ["n8n"],
    conversationId: String(item.conversationId ?? item.id ?? ""),
    lastMessagePreview: typeof item.lastMessagePreview === "string" ? item.lastMessagePreview : undefined,
    lastMessageAt: typeof item.lastMessageAt === "string" ? item.lastMessageAt : undefined
  }));
}

export async function fetchMessagesFromN8n(input: {
  contactId: string;
  phone?: string;
  channel: "whatsapp" | "email";
}, config?: WhatsAppRuntimeConfig | null): Promise<ChatMessage[]> {
  if (!isN8nConfigured(config)) return [];

  const path = resolvePath(config, "messages");
  const url = `${path}${path.includes("?") ? "&" : "?"}contactId=${encodeURIComponent(input.contactId)}&channel=${encodeURIComponent(input.channel)}&phone=${encodeURIComponent(normalizePhone(input.phone))}`;
  const payload = await requestN8n(url, config, { method: "GET" });
  const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  return list.map((item: any) => ({
    id: String(item.id ?? crypto.randomUUID()),
    contactId: String(item.contactId ?? input.contactId),
    channel: input.channel,
    direction: item.direction === "out" ? "out" : "in",
    text: typeof item.text === "string" ? item.text : undefined,
    attachment: item.attachment,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
  }));
}

export async function sendMessageToN8n(payload: Record<string, unknown>, config?: WhatsAppRuntimeConfig | null) {
  if (!isN8nConfigured(config)) return null;
  const path = resolvePath(config, "send");
  return requestN8n(path, config, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function emitChatEventToN8n(event: ChatEventPayload, config?: WhatsAppRuntimeConfig | null) {
  const webhook = resolveWebhook(config);
  if (!webhook) return;

  try {
    await requestN8n(webhook, config, {
      method: "POST",
      body: JSON.stringify(event)
    });
  } catch (error) {
    console.warn("Failed to dispatch chat event to n8n", error);
  }
}
