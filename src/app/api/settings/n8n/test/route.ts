import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsAppConfig, resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const fromBody = normalizeWhatsAppConfig(body);
    const config = await resolveWhatsAppConfig(request, fromBody);

    const baseUrl = normalizeBaseUrl(config?.n8nBaseUrl || "");
    if (!baseUrl) {
      return NextResponse.json({ error: "n8nBaseUrl não configurada" }, { status: 400 });
    }

    const apiKey = config?.n8nApiKey;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-N8N-API-KEY": apiKey, Authorization: `Bearer ${apiKey}` } : {})
    };

    const candidates = apiKey
      ? ["/api/v1/workflows?limit=1", "/healthz/readiness", "/healthz"]
      : ["/healthz/readiness", "/healthz", "/api/v1/workflows?limit=1"];

    const attempts: Array<Record<string, unknown>> = [];

    for (const path of candidates) {
      const start = Date.now();
      const timer = withTimeout(15000);
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          method: "GET",
          headers,
          signal: timer.signal
        });
        timer.clear();

        const bodyText = await res.text();
        const elapsedMs = Date.now() - start;
        const payload = (() => {
          try {
            return JSON.parse(bodyText);
          } catch {
            return bodyText.slice(0, 300);
          }
        })();

        attempts.push({ path, status: res.status, ok: res.ok, elapsedMs });

        if (res.ok) {
          return NextResponse.json({
            data: {
              ok: true,
              validatedPath: path,
              elapsedMs,
              attempts,
              sample: payload
            }
          });
        }
      } catch (error: any) {
        timer.clear();
        attempts.push({ path, ok: false, error: error?.message || "request failed" });
      }
    }

    return NextResponse.json({ error: "Não foi possível validar comunicação com n8n", attempts }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erro ao testar integração n8n" }, { status: 500 });
  }
}
