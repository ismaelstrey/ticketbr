import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsAppConfig, resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";
import { writeAuditLog } from "@/server/services/audit-log";
import { enforceAdminRouteSecurity, withRateLimitHeaders } from "@/server/services/sensitive-route-guard";

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

export async function POST(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.n8n.test");
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const fromBody = normalizeWhatsAppConfig(body);
    const config = await resolveWhatsAppConfig(request, fromBody);

    const baseUrl = normalizeBaseUrl(config?.n8nBaseUrl || "");
    if (!baseUrl) {
      return withRateLimitHeaders(NextResponse.json({ error: "n8nBaseUrl nao configurada" }, { status: 400 }), guard.rate);
    }

    const apiKey = config?.n8nApiKey;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-N8N-API-KEY": apiKey, Authorization: `Bearer ${apiKey}` } : {})
    };

    const conversationsPath = config?.n8nConversationsPath || "/conversations";
    const messagesPath = config?.n8nMessagesPath || "/messages";
    const sendPath = config?.n8nSendPath || "/send";

    const pathsToTest = [
      { path: "/healthz", method: "GET", description: "Healthcheck" },
      { path: conversationsPath, method: "GET", description: "Conversations Path" },
      { path: messagesPath, method: "GET", description: "Messages Path" },
      { path: sendPath, method: "GET", description: "Send Path (Check)" }
    ];

    const results: Array<Record<string, unknown>> = [];
    let overallSuccess = false;

    for (const test of pathsToTest) {
      const start = Date.now();
      const timer = withTimeout(10000);

      try {
        const fullUrl = `${baseUrl}${test.path.startsWith("/") ? "" : "/"}${test.path}`;
        const res = await fetch(fullUrl, {
          method: test.method,
          headers,
          signal: timer.signal
        });
        timer.clear();

        const elapsedMs = Date.now() - start;
        const status = res.status;

        const isRouteValid = status !== 404;
        const isAuthValid = status !== 401 && status !== 403;

        results.push({
          path: test.path,
          description: test.description,
          status,
          ok: res.ok,
          validRoute: isRouteValid,
          validAuth: isAuthValid,
          elapsedMs
        });

        if (test.path === "/healthz" && res.ok) {
          overallSuccess = true;
        }
      } catch (error: any) {
        timer.clear();
        results.push({
          path: test.path,
          description: test.description,
          ok: false,
          error: error?.message || "Network error"
        });
      }
    }

    await writeAuditLog({
      actorUserId: guard.actorUserId,
      action: "integration_n8n_paths_test",
      entity: "n8n",
      metadata: {
        baseUrl,
        totalChecks: results.length,
        overallSuccess
      }
    });

    if (overallSuccess) {
      return withRateLimitHeaders(
        NextResponse.json({
          data: {
            ok: true,
            results
          }
        }),
        guard.rate
      );
    }

    return withRateLimitHeaders(
      NextResponse.json(
        {
          error: "Falha na comunicacao com n8n",
          details: results
        },
        { status: 502 }
      ),
      guard.rate
    );
  } catch (error: any) {
    return withRateLimitHeaders(NextResponse.json({ error: error?.message || "Erro ao testar integracao n8n" }, { status: 500 }), guard.rate);
  }
}
