import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTicketsOperationalDashboard } from "@/server/services/tickets-operational-dashboard";
import { Prisma } from "@/lib/prisma";

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
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const requestId = crypto.randomUUID();

  try {
    const cacheKey = cacheKeyFromQuery(parsed.data);
    const cached = dashboardCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.value, {
        headers: {
          "Cache-Control": "private, max-age=15",
          "X-Cache": "HIT"
        }
      });
    }

    const result = await getTicketsOperationalDashboard(parsed.data);
    dashboardCache.set(cacheKey, { value: result, expiresAt: now + DASHBOARD_CACHE_TTL_MS });

    if (dashboardCache.size > 50) {
      for (const [key, entry] of dashboardCache) {
        if (entry.expiresAt <= now || dashboardCache.size > 50) dashboardCache.delete(key);
      }
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=15",
        "X-Cache": "MISS"
      }
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV !== "production";
    const message = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021") {
        return NextResponse.json(
          { error: "Banco de dados sem migrations para dashboard", requestId },
          { status: 500 }
        );
      }
      if (error.code === "P2010") {
        return NextResponse.json(
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
          { status: 500 }
        );
      }
    }

    if (/P1001|P1002|advisory lock|ECONNREFUSED|Can't reach database server/i.test(message)) {
      return NextResponse.json(
        { error: "Banco de dados indisponível", requestId, ...(isDev && debug ? { details: message } : {}) },
        { status: 503 }
      );
    }

    console.error("[dashboard/tickets] failed", { requestId }, error);
    return NextResponse.json(
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
      { status: 500 }
    );
  }
}
