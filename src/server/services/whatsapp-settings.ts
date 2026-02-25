import type { NextRequest } from "next/server";

export interface WhatsAppRuntimeConfig {
  baseUrl: string;
  apiKey: string;
  instance: string;
  webhookUrl?: string;
  autoLinkTickets?: boolean;
  n8nWebhookUrl?: string;
}

export const WHATSAPP_CONFIG_COOKIE = "ticketbr_whatsapp_cfg";

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input) as WhatsAppRuntimeConfig;
  } catch {
    return null;
  }
}

export function normalizeWhatsAppConfig(input: unknown): WhatsAppRuntimeConfig | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  const baseUrl = String(raw.baseUrl ?? raw.evolutionBaseUrl ?? "").trim();
  const apiKey = String(raw.apiKey ?? raw.evolutionApiKey ?? "").trim();
  const instance = String(raw.instance ?? raw.evolutionInstance ?? "").trim();

  if (!baseUrl || !apiKey || !instance) {
    return null;
  }

  return {
    baseUrl,
    apiKey,
    instance,
    webhookUrl: String(raw.webhookUrl ?? "").trim() || undefined,
    autoLinkTickets: raw.autoLinkTickets === undefined ? undefined : Boolean(raw.autoLinkTickets),
    n8nWebhookUrl: String(raw.n8nWebhookUrl ?? "").trim() || undefined
  };
}

export function encodeWhatsAppConfigCookie(config: WhatsAppRuntimeConfig) {
  return encodeURIComponent(JSON.stringify(config));
}

export function decodeWhatsAppConfigCookie(value?: string): WhatsAppRuntimeConfig | null {
  if (!value) return null;
  const decoded = safeJsonParse(decodeURIComponent(value));
  return normalizeWhatsAppConfig(decoded);
}

export function getWhatsAppConfigFromRequest(request: NextRequest): WhatsAppRuntimeConfig | null {
  const bodyConfig = (request as any).__ticketbrBodyConfig as WhatsAppRuntimeConfig | undefined;
  if (bodyConfig) return bodyConfig;

  const cookieValue = request.cookies.get(WHATSAPP_CONFIG_COOKIE)?.value;
  return decodeWhatsAppConfigCookie(cookieValue);
}

export function sanitizeWhatsAppConfig(config: WhatsAppRuntimeConfig) {
  return {
    ...config,
    apiKeyMasked: config.apiKey.length > 8 ? `${config.apiKey.slice(0, 4)}••••${config.apiKey.slice(-4)}` : "••••",
    apiKey: undefined
  };
}
