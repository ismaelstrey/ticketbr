import { NextRequest, NextResponse } from "next/server";

function trimUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function toPositiveInt(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function shouldRetryStatus(status: number) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

async function fetchWithRetry(input: string, init: RequestInit & { timeoutMs: number }, retries: number, retryDelayMs: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 1 + retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), init.timeoutMs);
    const start = Date.now();
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      const latencyMs = Date.now() - start;
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return { res, json, latencyMs };
      }
      const json = await res.json().catch(() => ({}));
      lastError = { res, json, latencyMs };
      if (attempt < retries && shouldRetryStatus(res.status)) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
      return { res, json, latencyMs };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Falha ao testar conexão");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const baseUrl = trimUrl(String(body?.baseUrl ?? ""));
    const apiKey = String(body?.apiKey ?? "").trim();
    const timeoutMs = toPositiveInt(body?.timeoutMs, 15000);
    const retryEnabled = Boolean(body?.retryEnabled);
    const retryMax = toPositiveInt(body?.retryMax, 1);
    const retryDelayMs = toPositiveInt(body?.retryDelayMs, 750);
    const logEnabled = Boolean(body?.logEnabled);

    if (!baseUrl) {
      return NextResponse.json({ ok: false, message: "Informe a URL do serviço." }, { status: 400 });
    }

    const url = apiKey ? `${baseUrl}/api/v1/workflows?limit=1` : `${baseUrl}/healthz/readiness`;
    const retries = retryEnabled ? Math.min(Math.max(retryMax, 0), 5) : 0;

    const { res, json, latencyMs } = await fetchWithRetry(
      url,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(apiKey ? { "X-N8N-API-KEY": apiKey } : {})
        },
        timeoutMs
      },
      retries,
      retryDelayMs
    );

    const isOk = res.ok || res.status === 304;
    if (!isOk) {
      const msg = String((json as any)?.message ?? (json as any)?.error ?? `Falha ao conectar (HTTP ${res.status}).`);
      return NextResponse.json(
        {
          ok: false,
          message: msg,
          statusCode: res.status,
          latencyMs,
          details: logEnabled
            ? {
                request: {
                  method: "GET",
                  url,
                  headers: apiKey ? { accept: "application/json", "X-N8N-API-KEY": "••••" } : { accept: "application/json" },
                  timeoutMs,
                  retries,
                  retryDelayMs
                },
                response: { status: res.status }
              }
            : undefined
        },
        { status: 200 }
      );
    }

    const count =
      apiKey ? (Array.isArray(json) ? json.length : Array.isArray((json as any)?.data) ? (json as any).data.length : undefined) : undefined;
    return NextResponse.json({
      ok: true,
      message: apiKey
        ? (typeof count === "number" ? `Conexão OK. Itens retornados: ${count}.` : "Conexão OK.")
        : "Conexão OK. Instância acessível via /healthz/readiness (API Key não informada).",
      statusCode: res.status,
      latencyMs,
      details: logEnabled
        ? {
            request: {
              method: "GET",
              url,
              headers: apiKey ? { accept: "application/json", "X-N8N-API-KEY": "••••" } : { accept: "application/json" },
              timeoutMs,
              retries,
              retryDelayMs
            },
            response: { status: res.status }
          }
        : undefined
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message ?? "Falha ao testar conexão.",
        statusCode: 0
      },
      { status: 200 }
    );
  }
}
