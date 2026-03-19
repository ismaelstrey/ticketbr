import type { WhatsAppRuntimeConfig } from "@/server/services/whatsapp-settings";

export type UazapiTransport = "rest" | "sse" | "websocket" | "graphql";

export class UazapiRequestError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "UazapiRequestError";
    this.status = status;
    this.details = details;
  }
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function resolveUazapiBaseUrl(config?: WhatsAppRuntimeConfig | null) {
  const direct = normalizeBaseUrl(config?.uazapiBaseUrl || process.env.UAZAPI_BASE_URL || "");
  if (direct) return direct;
  const subdomain = (config?.uazapiSubdomain || (process.env.UAZAPI_SUBDOMAIN as any) || "api") as "api" | "free";
  return `https://${subdomain}.uazapi.com`;
}

export function isUazapiConfigured(config?: WhatsAppRuntimeConfig | null) {
  const base = resolveUazapiBaseUrl(config);
  const token = String(config?.uazapiToken || process.env.UAZAPI_TOKEN || "").trim();
  return Boolean(base && token);
}

function resolveTokens(config?: WhatsAppRuntimeConfig | null) {
  return {
    token: String(config?.uazapiToken || process.env.UAZAPI_TOKEN || "").trim(),
    adminToken: String(config?.uazapiAdminToken || process.env.UAZAPI_ADMIN_TOKEN || "").trim()
  };
}

function buildUrl(base: string, pathOrUrl: string) {
  if (isAbsoluteUrl(pathOrUrl)) return pathOrUrl;
  const normalizedBase = normalizeBaseUrl(base);
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizedBase}${normalizedPath}`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function resolveRetryPolicy(config?: WhatsAppRuntimeConfig | null) {
  const enabledRaw = config?.uazapiRetryEnabled ?? (process.env.UAZAPI_RETRY_ENABLED ? process.env.UAZAPI_RETRY_ENABLED !== "false" : true);
  const enabled = Boolean(enabledRaw);
  const max = Number.isFinite(Number(config?.uazapiRetryMax)) ? Number(config?.uazapiRetryMax) : (process.env.UAZAPI_RETRY_MAX ? Number(process.env.UAZAPI_RETRY_MAX) : 2);
  const baseDelayMs = Number.isFinite(Number(config?.uazapiRetryDelayMs)) ? Number(config?.uazapiRetryDelayMs) : (process.env.UAZAPI_RETRY_DELAY_MS ? Number(process.env.UAZAPI_RETRY_DELAY_MS) : 650);
  return {
    enabled,
    max: Math.max(0, Math.min(6, Number.isFinite(max) ? max : 0)),
    baseDelayMs: Math.max(0, Math.min(15_000, Number.isFinite(baseDelayMs) ? baseDelayMs : 0))
  };
}

function resolveTimeoutMs(config?: WhatsAppRuntimeConfig | null) {
  const v = Number(config?.uazapiTimeoutMs ?? process.env.UAZAPI_TIMEOUT_MS ?? 15000);
  return Number.isFinite(v) ? Math.max(1000, Math.min(v, 120_000)) : 15000;
}

function resolveLogEnabled(config?: WhatsAppRuntimeConfig | null) {
  return Boolean(config?.uazapiLogEnabled ?? (process.env.UAZAPI_LOG_ENABLED === "true"));
}

function toQueryString(query?: Record<string, string | number | boolean | undefined | null>) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const built = params.toString();
  return built ? `?${built}` : "";
}

function assertRequired(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} é obrigatório`);
  }
}

export async function requestUazapi(input: {
  pathOrUrl: string;
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: "token" | "admintoken" | "none";
}, config?: WhatsAppRuntimeConfig | null) {
  const base = resolveUazapiBaseUrl(config);
  const { token, adminToken } = resolveTokens(config);
  const url = buildUrl(base, input.pathOrUrl) + toQueryString(input.query);
  const timeoutMs = resolveTimeoutMs(config);
  const retry = resolveRetryPolicy(config);
  const logEnabled = resolveLogEnabled(config);
  const method = (input.method || "GET").toUpperCase();

  if (!url) throw new Error("UAZAPI baseUrl não configurada.");

  const auth = input.auth ?? "token";
  if (auth === "token" && !token) throw new Error("UAZAPI token não configurado.");
  if (auth === "admintoken" && !adminToken) throw new Error("UAZAPI admintoken não configurado.");

  const attemptRequest = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(auth === "token" ? { token } : {}),
          ...(auth === "admintoken" ? { admintoken: adminToken } : {}),
          ...input.headers
        },
        body: input.body === undefined ? undefined : JSON.stringify(input.body)
      });

      const text = await response.text();
      const json = text
        ? (() => {
            try {
              return JSON.parse(text);
            } catch {
              return { raw: text };
            }
          })()
        : null;

      if (logEnabled) {
        const ms = Date.now() - start;
        const safeUrl = url.replace(token, "****").replace(adminToken, "****");
        console.log(`[uazapi] ${method} ${safeUrl} -> ${response.status} (${ms}ms)`);
      }

      if (!response.ok) {
        throw new UazapiRequestError(
          (json as any)?.message || (json as any)?.error || `UAZAPI request failed (${response.status})`,
          response.status,
          json
        );
      }

      return json;
    } finally {
      clearTimeout(timer);
    }
  };

  let attempt = 0;
  while (true) {
    try {
      return await attemptRequest();
    } catch (error: any) {
      const status = error instanceof UazapiRequestError ? error.status : 0;
      const canRetry = retry.enabled && attempt < retry.max && (status ? shouldRetry(status) : true);
      if (!canRetry) throw error;
      const delay = Math.round(retry.baseDelayMs * Math.pow(2, attempt) + Math.random() * 120);
      await sleep(delay);
      attempt += 1;
    }
  }
}

export async function uazapiSendText(input: {
  number: string;
  text: string;
  delay?: number;
  readchat?: boolean;
  readmessages?: boolean;
  replyid?: string;
  linkPreview?: boolean;
}, config?: WhatsAppRuntimeConfig | null) {
  assertRequired(input.number, "number");
  assertRequired(input.text, "text");
  return requestUazapi(
    {
      pathOrUrl: "/send/text",
      method: "POST",
      body: {
        number: input.number,
        text: input.text,
        delay: input.delay,
        readchat: input.readchat,
        readmessages: input.readmessages,
        replyid: input.replyid,
        linkPreview: input.linkPreview
      }
    },
    config
  );
}

export async function uazapiSendMedia(input: {
  number: string;
  mediatype: string;
  media: string;
  caption?: string;
  fileName?: string;
  mimetype?: string;
  delay?: number;
}, config?: WhatsAppRuntimeConfig | null) {
  assertRequired(input.number, "number");
  assertRequired(input.mediatype, "mediatype");
  assertRequired(input.media, "media");
  return requestUazapi(
    {
      pathOrUrl: "/send/media",
      method: "POST",
      body: {
        number: input.number,
        mediatype: input.mediatype,
        media: input.media,
        caption: input.caption,
        fileName: input.fileName,
        mimetype: input.mimetype,
        delay: input.delay
      }
    },
    config
  );
}

export async function uazapiInstanceInit(input: { name: string }, config?: WhatsAppRuntimeConfig | null) {
  assertRequired(input.name, "name");
  return requestUazapi(
    {
      pathOrUrl: "/instance/init",
      method: "POST",
      auth: "admintoken",
      body: { name: input.name }
    },
    config
  );
}

export function buildUazapiSseUrl(input: { events?: string[] }, config?: WhatsAppRuntimeConfig | null) {
  const base = resolveUazapiBaseUrl(config);
  const { token } = resolveTokens(config);
  if (!token) throw new Error("UAZAPI token não configurado.");
  const events = Array.isArray(input.events) && input.events.length ? input.events.join(",") : undefined;
  return buildUrl(base, "/sse") + toQueryString({ token, ...(events ? { events } : {}) });
}

export async function openUazapiSseStream(input: { events?: string[] }, config?: WhatsAppRuntimeConfig | null) {
  const transport = (config?.uazapiTransport || "rest") as UazapiTransport;
  if (transport !== "sse") {
    throw new Error("Transporte SSE não está selecionado para UAZAPI.");
  }

  const url = buildUazapiSseUrl(input, config);
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new UazapiRequestError(`UAZAPI SSE failed (${response.status})`, response.status, text);
  }
  return response;
}
