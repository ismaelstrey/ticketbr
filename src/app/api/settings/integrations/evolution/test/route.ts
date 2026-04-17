import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/server/services/audit-log";
import { enforceAdminRouteSecurity, withRateLimitHeaders } from "@/server/services/sensitive-route-guard";

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
  throw lastError instanceof Error ? lastError : new Error("Falha ao testar conexao");
}

export async function POST(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.integrations.evolution.test");
  if (!guard.ok) {
    return guard.response;
  }

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
      return withRateLimitHeaders(NextResponse.json({ ok: false, message: "Informe a URL do servico." }, { status: 400 }), guard.rate);
    }
    if (!apiKey) {
      return withRateLimitHeaders(NextResponse.json({ ok: false, message: "Informe a API Key." }, { status: 400 }), guard.rate);
    }

    const url = `${baseUrl}/instance/fetchInstances`;
    const retries = retryEnabled ? Math.min(Math.max(retryMax, 0), 5) : 0;

    const { res, json, latencyMs } = await fetchWithRetry(
      url,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          apikey: apiKey
        },
        timeoutMs
      },
      retries,
      retryDelayMs
    );

    await writeAuditLog({
      actorUserId: guard.actorUserId,
      action: "integration_evolution_test",
      entity: "evolution",
      metadata: {
        baseUrl,
        statusCode: res.status,
        latencyMs,
        retries,
        ok: res.ok
      }
    });

    if (!res.ok) {
      const msg = String((json as any)?.message ?? (json as any)?.error ?? `Falha ao conectar (HTTP ${res.status}).`);
      return withRateLimitHeaders(
        NextResponse.json(
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
                    headers: { accept: "application/json", "content-type": "application/json", apikey: "****" },
                    timeoutMs,
                    retries,
                    retryDelayMs
                  },
                  response: { status: res.status }
                }
              : undefined
          },
          { status: 200 }
        ),
        guard.rate
      );
    }

    const count = Array.isArray((json as any)?.data) ? (json as any).data.length : undefined;
    return withRateLimitHeaders(
      NextResponse.json({
        ok: true,
        message: typeof count === "number" ? `Conexao OK. Instancias retornadas: ${count}.` : "Conexao OK.",
        statusCode: res.status,
        latencyMs,
        details: logEnabled
          ? {
              request: { method: "GET", url, headers: { accept: "application/json", "content-type": "application/json", apikey: "****" }, timeoutMs, retries, retryDelayMs },
              response: { status: res.status }
            }
          : undefined
      }),
      guard.rate
    );
  } catch (error: any) {
    return withRateLimitHeaders(
      NextResponse.json(
        {
          ok: false,
          message: error?.message ?? "Falha ao testar conexao.",
          statusCode: 0
        },
        { status: 200 }
      ),
      guard.rate
    );
  }
}
