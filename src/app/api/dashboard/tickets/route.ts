import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTicketsOperationalDashboard } from "@/server/services/tickets-operational-dashboard";
import { Prisma } from "@/lib/prisma";
import { createRequestContext, logRouteEvent } from "@/lib/observability";
import { trackRouteResponse } from "@/server/services/route-metrics-observability";

const ROUTE = "/api/dashboard/tickets";

const QuerySchema = z.object({
  preset: z.enum(["today", "7d", "30d", "custom"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  agentId: z.string().optional(),
  clientId: z.string().optional(),
  categoryId: z.string().optional(),
  q: z.string().optional()
});

const DASHBOARD_CACHE_TTL_MS = 15_000;
const dashboardCache = new Map<string, { expiresAt: number; value: unknown }>();

function cacheKeyFromQuery(filters: z.infer<typeof QuerySchema>) {
  return JSON.stringify(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)));
}

export async function GET(request: NextRequest) {
  const context = createRequestContext();
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    logRouteEvent("[dashboard/tickets] invalid_query", "warn", context);
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400, headers: { "x-request-id": context.requestId } })
    );
  }

  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const requestId = context.requestId;

  try {
    const cacheKey = cacheKeyFromQuery(parsed.data);
    const cached = dashboardCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      logRouteEvent("[dashboard/tickets] cache_hit", "info", context);
      return trackRouteResponse(
        ROUTE,
        "GET",
        context,
        NextResponse.json(cached.value, {
          headers: {
            "Cache-Control": "private, max-age=15",
            "X-Cache": "HIT",
            "x-request-id": context.requestId
          }
        })
      );
    }

    const result = await getTicketsOperationalDashboard(parsed.data);
    dashboardCache.set(cacheKey, { value: result, expiresAt: now + DASHBOARD_CACHE_TTL_MS });

    if (dashboardCache.size > 50) {
      for (const [key, entry] of dashboardCache) {
        if (entry.expiresAt <= now || dashboardCache.size > 50) dashboardCache.delete(key);
      }
    }

    logRouteEvent("[dashboard/tickets] cache_miss", "info", context);
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      NextResponse.json(result, {
        headers: {
          "Cache-Control": "private, max-age=15",
          "X-Cache": "MISS",
          "x-request-id": context.requestId
        }
      })
    );
  } catch (error) {
    const isDev = process.env.NODE_ENV !== "production";
    const message = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021") {
        logRouteEvent("[dashboard/tickets] failed", "error", context, { code: error.code });
        return trackRouteResponse(
          ROUTE,
          "GET",
          context,
          NextResponse.json(
            { error: "Banco de dados sem migrations para dashboard", requestId },
            { status: 500, headers: { "x-request-id": requestId } }
          )
        );
      }
      if (error.code === "P2010") {
        logRouteEvent("[dashboard/tickets] failed", "error", context, { code: error.code });
        return trackRouteResponse(
          ROUTE,
          "GET",
          context,
          NextResponse.json(
            {
              error: "Falha em consulta agregada do dashboard",
              requestId,
              ...(isDev && debug
                ? {
                    details: {
                      code: error.code,
                      meta: error.meta,
                      stack: error.stack
                    }
                  }
                : {})
            },
            { status: 500, headers: { "x-request-id": requestId } }
          )
        );
      }
    }

    if (/P1001|P1002|advisory lock|ECONNREFUSED|Can't reach database server/i.test(message)) {
      logRouteEvent("[dashboard/tickets] unavailable", "error", context, { message });
      return trackRouteResponse(
        ROUTE,
        "GET",
        context,
        NextResponse.json(
          { error: "Banco de dados indisponível", requestId, ...(isDev && debug ? { details: message } : {}) },
          { status: 503, headers: { "x-request-id": requestId } }
        )
      );
    }

    console.error("[dashboard/tickets] failed", { requestId }, error);
    logRouteEvent("[dashboard/tickets] failed", "error", context, { message });
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      NextResponse.json(
        {
          error: "Erro ao carregar dashboard",
          requestId,
          ...(isDev && debug
            ? {
                details: message,
                stack: error instanceof Error ? error.stack : undefined
              }
            : {})
        },
        { status: 500, headers: { "x-request-id": requestId } }
      )
    );
  }
}
