import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export interface WhatsAppRuntimeConfig {
  whatsappProvider?: "n8n" | "evolution" | "uazapi";

  // Evolution (opcional quando fluxo é n8n-first)
  baseUrl?: string;
  apiKey?: string;
  instance?: string;

  evolutionTimeoutMs?: number;
  evolutionRetryEnabled?: boolean;
  evolutionRetryMax?: number;
  evolutionRetryDelayMs?: number;
  evolutionLogEnabled?: boolean;

  // Comportamento do chat
  webhookUrl?: string;
  evolutionWebhookUrl?: string;
  autoLinkTickets?: boolean;

  // n8n automation hub
  n8nWebhookUrl?: string;
  n8nBaseUrl?: string;
  n8nApiKey?: string;
  n8nUseTestWebhook?: boolean;
  n8nConversationsPath?: string;
  n8nMessagesPath?: string;
  n8nSendPath?: string;
  n8nContactsPath?: string;

  n8nTimeoutMs?: number;
  n8nRetryEnabled?: boolean;
  n8nRetryMax?: number;
  n8nRetryDelayMs?: number;
  n8nLogEnabled?: boolean;

  // UAZAPI
  uazapiBaseUrl?: string;
  uazapiSubdomain?: "free" | "api";
  uazapiToken?: string;
  uazapiAdminToken?: string;
  uazapiTransport?: "rest" | "sse" | "websocket" | "graphql";

  uazapiTimeoutMs?: number;
  uazapiRetryEnabled?: boolean;
  uazapiRetryMax?: number;
  uazapiRetryDelayMs?: number;
  uazapiLogEnabled?: boolean;
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

  const toProviderOrUndefined = (value: unknown) => {
    const v = String(value ?? "").trim();
    if (v === "n8n" || v === "evolution" || v === "uazapi") return v;
    return undefined;
  };

  const toUazapiSubdomainOrUndefined = (value: unknown) => {
    const v = String(value ?? "").trim();
    if (v === "free" || v === "api") return v;
    return undefined;
  };

  const toUazapiTransportOrUndefined = (value: unknown) => {
    const v = String(value ?? "").trim();
    if (v === "rest" || v === "sse" || v === "websocket" || v === "graphql") return v;
    return undefined;
  };

  const toNumberOrUndefined = (value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : undefined;
  };

  const evolutionTimeoutMsRaw = raw.evolutionTimeoutMs ?? raw.timeoutMs ?? undefined;
  const evolutionRetryMaxRaw = raw.evolutionRetryMax ?? undefined;
  const evolutionRetryDelayMsRaw = raw.evolutionRetryDelayMs ?? undefined;

  const n8nTimeoutMsRaw = raw.n8nTimeoutMs ?? undefined;
  const n8nRetryMaxRaw = raw.n8nRetryMax ?? undefined;
  const n8nRetryDelayMsRaw = raw.n8nRetryDelayMs ?? undefined;

  const uazapiTimeoutMsRaw = raw.uazapiTimeoutMs ?? undefined;
  const uazapiRetryMaxRaw = raw.uazapiRetryMax ?? undefined;
  const uazapiRetryDelayMsRaw = raw.uazapiRetryDelayMs ?? undefined;

  const config: WhatsAppRuntimeConfig = {
    whatsappProvider: toProviderOrUndefined(raw.whatsappProvider),
    baseUrl: String(raw.baseUrl ?? raw.evolutionBaseUrl ?? "").trim() || undefined,
    apiKey: String(raw.apiKey ?? raw.evolutionApiKey ?? "").trim() || undefined,
    instance: String(raw.instance ?? raw.evolutionInstance ?? "").trim() || undefined,
    webhookUrl: String(raw.webhookUrl ?? raw.evolutionWebhookUrl ?? "").trim() || undefined,
    evolutionWebhookUrl: String(raw.evolutionWebhookUrl ?? raw.webhookUrl ?? "").trim() || undefined,
    autoLinkTickets: raw.autoLinkTickets === undefined ? undefined : Boolean(raw.autoLinkTickets),
    n8nWebhookUrl: String(raw.n8nWebhookUrl ?? "").trim() || undefined,
    n8nUseTestWebhook: raw.n8nUseTestWebhook === undefined ? undefined : Boolean(raw.n8nUseTestWebhook),

    evolutionTimeoutMs: toNumberOrUndefined(evolutionTimeoutMsRaw),
    evolutionRetryEnabled: raw.evolutionRetryEnabled === undefined ? undefined : Boolean(raw.evolutionRetryEnabled),
    evolutionRetryMax: toNumberOrUndefined(evolutionRetryMaxRaw),
    evolutionRetryDelayMs: toNumberOrUndefined(evolutionRetryDelayMsRaw),
    evolutionLogEnabled: raw.evolutionLogEnabled === undefined ? undefined : Boolean(raw.evolutionLogEnabled),

    n8nBaseUrl: String(raw.n8nBaseUrl ?? "").trim() || undefined,
    n8nApiKey: String(raw.n8nApiKey ?? "").trim() || undefined,
    n8nConversationsPath: String(raw.n8nConversationsPath ?? "").trim() || undefined,
    n8nMessagesPath: String(raw.n8nMessagesPath ?? "").trim() || undefined,
    n8nSendPath: String(raw.n8nSendPath ?? "").trim() || undefined,
    n8nContactsPath: String(raw.n8nContactsPath ?? "").trim() || undefined,

    n8nTimeoutMs: toNumberOrUndefined(n8nTimeoutMsRaw),
    n8nRetryEnabled: raw.n8nRetryEnabled === undefined ? undefined : Boolean(raw.n8nRetryEnabled),
    n8nRetryMax: toNumberOrUndefined(n8nRetryMaxRaw),
    n8nRetryDelayMs: toNumberOrUndefined(n8nRetryDelayMsRaw),
    n8nLogEnabled: raw.n8nLogEnabled === undefined ? undefined : Boolean(raw.n8nLogEnabled),

    uazapiBaseUrl: String(raw.uazapiBaseUrl ?? "").trim() || undefined,
    uazapiSubdomain: toUazapiSubdomainOrUndefined(raw.uazapiSubdomain),
    uazapiToken: String(raw.uazapiToken ?? "").trim() || undefined,
    uazapiAdminToken: String(raw.uazapiAdminToken ?? "").trim() || undefined,
    uazapiTransport: toUazapiTransportOrUndefined(raw.uazapiTransport),

    uazapiTimeoutMs: toNumberOrUndefined(uazapiTimeoutMsRaw),
    uazapiRetryEnabled: raw.uazapiRetryEnabled === undefined ? undefined : Boolean(raw.uazapiRetryEnabled),
    uazapiRetryMax: toNumberOrUndefined(uazapiRetryMaxRaw),
    uazapiRetryDelayMs: toNumberOrUndefined(uazapiRetryDelayMsRaw),
    uazapiLogEnabled: raw.uazapiLogEnabled === undefined ? undefined : Boolean(raw.uazapiLogEnabled)
  };


  const hasEvolution = Boolean(config.baseUrl && config.apiKey && config.instance);
  const hasN8n = Boolean(config.n8nWebhookUrl || config.n8nBaseUrl);
  const hasUazapi = Boolean((config.uazapiBaseUrl || config.uazapiSubdomain) && config.uazapiToken);

  if (!hasEvolution && !hasN8n && !hasUazapi) {
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
    evolutionWebhookUrl: config.evolutionWebhookUrl ?? config.webhookUrl,
    apiKeyMasked: config.apiKey
      ? (config.apiKey.length > 8 ? `${config.apiKey.slice(0, 4)}••••${config.apiKey.slice(-4)}` : "••••")
      : undefined,
    n8nApiKeyMasked: config.n8nApiKey
      ? (config.n8nApiKey.length > 8 ? `${config.n8nApiKey.slice(0, 4)}••••${config.n8nApiKey.slice(-4)}` : "••••")
      : undefined,
    uazapiTokenMasked: config.uazapiToken
      ? (config.uazapiToken.length > 8 ? `${config.uazapiToken.slice(0, 4)}••••${config.uazapiToken.slice(-4)}` : "••••")
      : undefined,
    uazapiAdminTokenMasked: config.uazapiAdminToken
      ? (config.uazapiAdminToken.length > 8 ? `${config.uazapiAdminToken.slice(0, 4)}••••${config.uazapiAdminToken.slice(-4)}` : "••••")
      : undefined,
    apiKey: undefined,
    n8nApiKey: undefined,
    uazapiToken: undefined,
    uazapiAdminToken: undefined
  };
}
