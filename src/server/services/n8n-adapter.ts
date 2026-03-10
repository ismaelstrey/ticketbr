import { ChatContact, ChatMessage } from "@/types/chat";
import { WhatsAppRuntimeConfig } from "@/server/services/whatsapp-settings";
import { toE164 } from "@/lib/phone-utils";

export interface ChatEventPayload {
  type: string;
  source: "ticketbr-chat";
  occurredAt: string;
  data: Record<string, unknown>;
}

function resolveWebhook(config?: WhatsAppRuntimeConfig | null) {
  const url = config?.n8nWebhookUrl || process.env.N8N_CHAT_WEBHOOK_URL || "";

  if (config?.n8nUseTestWebhook) {
    return url.replace("/webhook/", "/webhook-test/");
  }

  return url.replace("/webhook-test/", "/webhook/");
}

function resolveN8nBase(config?: WhatsAppRuntimeConfig | null) {
  return config?.n8nBaseUrl || process.env.N8N_CHAT_BASE_URL || "";
}

function resolvePath(config: WhatsAppRuntimeConfig | null | undefined, key: "conversations" | "messages" | "send") {
  if (key === "conversations") return config?.n8nConversationsPath || "/conversations";
  if (key === "messages") return config?.n8nMessagesPath || "/messages";
  return config?.n8nSendPath || "/messages/send";
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizePhone(value?: string) {
  if (!value) return "";
  const e164 = toE164(value, "BR");
  return (e164 ?? value).replace(/\D/g, "");
}

function buildUrl(base: string, pathOrUrl: string) {
  if (isAbsoluteUrl(pathOrUrl)) return pathOrUrl;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizedBase}${normalizedPath}`;
}

function normalizeWebhookUrl(url: string) {
  return url.replace("/webhook-test/", "/webhook/");
}

function isNotFoundError(error: unknown) {
  return String((error as any)?.message || "").includes("(404)");
}

async function performN8nRequest(url: string, apiKey: string | undefined, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}`, "X-N8N-API-KEY": apiKey } : {}),
      ...init?.headers
    }
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || json?.error || `n8n request failed (${response.status})`);
  }

  return json;
}

async function requestN8n(pathOrUrl: string, config?: WhatsAppRuntimeConfig | null, init?: RequestInit) {
  const base = resolveN8nBase(config);
  if (!base && !isAbsoluteUrl(pathOrUrl)) {
    throw new Error("n8n não configurado. Defina n8nBaseUrl nas configurações.");
  }

  const url = buildUrl(base, pathOrUrl);
  const apiKey = config?.n8nApiKey || process.env.N8N_CHAT_API_KEY;

  try {
    return await performN8nRequest(url, apiKey, init);
  } catch (error: any) {
    const normalized = normalizeWebhookUrl(url);
    const shouldRetryWithProdWebhook =
      normalized !== url &&
      String(error?.message || "").toLowerCase().includes("webhook") &&
      String(error?.message || "").toLowerCase().includes("not registered");

    if (shouldRetryWithProdWebhook) {
      return performN8nRequest(normalized, apiKey, init);
    }

    throw error;
  }
}

async function requestN8nChatPath(path: string, config: WhatsAppRuntimeConfig | null | undefined, init?: RequestInit) {
  if (isAbsoluteUrl(path)) {
    return requestN8n(path, config, init);
  }

  const base = resolveN8nBase(config);
  const webhook = resolveWebhook(config);
  const candidates = [
    ...(base ? [path] : []),
    ...(webhook ? [buildUrl(webhook, path)] : [])
  ].filter((value, index, list) => list.indexOf(value) === index);

  if (!candidates.length) {
    throw new Error("n8n não configurado. Defina n8nBaseUrl ou n8nWebhookUrl nas configurações.");
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await requestN8n(candidate, config, init);
    } catch (error) {
      lastError = error;
      if (!isNotFoundError(error)) throw error;
    }
  }

  throw lastError;
}

export function isN8nConfigured(config?: WhatsAppRuntimeConfig | null) {
  return Boolean(resolveWebhook(config) || resolveN8nBase(config));
}

export async function fetchConversationsFromN8n(config?: WhatsAppRuntimeConfig | null): Promise<ChatContact[]> {
  if (!isN8nConfigured(config)) return [];

  const relPath = resolvePath(config, "conversations");
  const payload = await requestN8nChatPath(relPath, config, { method: "GET" });
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

  const relPath = resolvePath(config, "messages");
  const query = `contactId=${encodeURIComponent(input.contactId)}&channel=${encodeURIComponent(input.channel)}&phone=${encodeURIComponent(normalizePhone(input.phone))}`;
  const url = `${relPath}${relPath.includes("?") ? "&" : "?"}${query}`;

  const payload = await requestN8nChatPath(url, config, { method: "GET" });
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

  const relPath = resolvePath(config, "send");
  const webhook = resolveWebhook(config);

  try {
    return await requestN8nChatPath(relPath, config, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  } catch (error: any) {
    const message = String(error?.message || "").toLowerCase();
    const isWebhookRouteIssue = message.includes("not registered") || message.includes("(404)");

    if (webhook && isWebhookRouteIssue) {
      return requestN8n(webhook, config, {
        method: "POST",
        body: JSON.stringify({
          type: "chat.message.send.request",
          source: "ticketbr-chat",
          occurredAt: new Date().toISOString(),
          data: payload
        })
      });
    }

    throw error;
  }
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
