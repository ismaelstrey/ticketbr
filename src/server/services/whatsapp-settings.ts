import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export interface WhatsAppRuntimeConfig {
  // Evolution (opcional quando fluxo é n8n-first)
  baseUrl?: string;
  apiKey?: string;
  instance?: string;

  // Comportamento do chat
  webhookUrl?: string;
  autoLinkTickets?: boolean;

  // n8n automation hub
  n8nWebhookUrl?: string;
  n8nBaseUrl?: string;
  n8nApiKey?: string;
  n8nConversationsPath?: string;
  n8nMessagesPath?: string;
  n8nSendPath?: string;
}

export const WHATSAPP_CONFIG_COOKIE = "ticketbr_whatsapp_cfg";
const WHATSAPP_CONFIG_DB_KEY = "whatsapp_runtime_config";

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

  const config: WhatsAppRuntimeConfig = {
    baseUrl: String(raw.baseUrl ?? raw.evolutionBaseUrl ?? "").trim() || undefined,
    apiKey: String(raw.apiKey ?? raw.evolutionApiKey ?? "").trim() || undefined,
    instance: String(raw.instance ?? raw.evolutionInstance ?? "").trim() || undefined,
    webhookUrl: String(raw.webhookUrl ?? "").trim() || undefined,
    autoLinkTickets: raw.autoLinkTickets === undefined ? undefined : Boolean(raw.autoLinkTickets),
    n8nWebhookUrl: String(raw.n8nWebhookUrl ?? "").trim() || undefined,
    n8nBaseUrl: String(raw.n8nBaseUrl ?? "").trim() || undefined,
    n8nApiKey: String(raw.n8nApiKey ?? "").trim() || undefined,
    n8nConversationsPath: String(raw.n8nConversationsPath ?? "").trim() || undefined,
    n8nMessagesPath: String(raw.n8nMessagesPath ?? "").trim() || undefined,
    n8nSendPath: String(raw.n8nSendPath ?? "").trim() || undefined
  };

  const hasEvolution = Boolean(config.baseUrl && config.apiKey && config.instance);
  const hasN8n = Boolean(config.n8nWebhookUrl || config.n8nBaseUrl);

  if (!hasEvolution && !hasN8n) {
    return null;
  }

  return config;
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

export async function getWhatsAppConfigFromDatabase(): Promise<WhatsAppRuntimeConfig | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ value: unknown }>>(
      `SELECT value FROM app_runtime_settings WHERE key = $1 LIMIT 1`,
      WHATSAPP_CONFIG_DB_KEY
    );

    if (!rows?.[0]?.value) return null;
    return normalizeWhatsAppConfig(rows[0].value);
  } catch {
    return null;
  }
}

export async function saveWhatsAppConfigToDatabase(config: WhatsAppRuntimeConfig) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_runtime_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO app_runtime_settings (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `,
    WHATSAPP_CONFIG_DB_KEY,
    JSON.stringify(config)
  );
}

export async function resolveWhatsAppConfig(request: NextRequest, bodyConfig?: WhatsAppRuntimeConfig | null) {
  const requestConfig = bodyConfig ?? getWhatsAppConfigFromRequest(request);
  if (requestConfig) return requestConfig;
  return getWhatsAppConfigFromDatabase();
}

export function sanitizeWhatsAppConfig(config: WhatsAppRuntimeConfig) {
  return {
    ...config,
    apiKeyMasked: config.apiKey
      ? (config.apiKey.length > 8 ? `${config.apiKey.slice(0, 4)}••••${config.apiKey.slice(-4)}` : "••••")
      : undefined,
    n8nApiKeyMasked: config.n8nApiKey
      ? (config.n8nApiKey.length > 8 ? `${config.n8nApiKey.slice(0, 4)}••••${config.n8nApiKey.slice(-4)}` : "••••")
      : undefined,
    apiKey: undefined,
    n8nApiKey: undefined
  };
}
