import { NextRequest } from "next/server";
import { z } from "zod";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { getSession } from "@/lib/auth";
import { listNotifications, markNotificationsRead } from "@/server/services/notifications";
import { trackRouteResponse } from "@/server/services/route-metrics-observability";

const ROUTE = "/api/notifications";

const MarkReadSchema = z.object({
  id: z.string().min(1).optional(),
  all: z.boolean().optional()
});

// Lê o id do usuário autenticado (staff ou cliente compartilham o modelo User)
function resolveUserId(session: unknown): string | null {
  const source = (session ?? {}) as Record<string, unknown>;
  const id = String(source.id || source.sub || "").trim();
  return id || null;
}

export async function GET(request: NextRequest) {
  const context = createRequestContext();
  let userId: string | null = null;

  try {
    const session = await getSession();
    userId = resolveUserId(session);
    if (!userId) {
      return trackRouteResponse(ROUTE, "GET", context, jsonWithRequestId({ error: "Unauthorized" }, context, { status: 401 }));
    }

    const limitParam = Number(request.nextUrl.searchParams.get("limit"));
    const data = await listNotifications(userId, { limit: Number.isFinite(limitParam) ? limitParam : undefined });

    logRouteEvent("[notifications] list ok", "info", context, { userId, unreadCount: data.unreadCount });
    return trackRouteResponse(ROUTE, "GET", context, jsonWithRequestId({ data }, context), { actorUserId: userId });
  } catch (error) {
    logRouteEvent("[notifications] list failed", "error", context, {
      userId,
      error: error instanceof Error ? error.message : "unknown"
    });
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId({ error: "Erro ao carregar notificações" }, context, { status: 500 }),
      { actorUserId: userId }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const context = createRequestContext();
  let userId: string | null = null;

  try {
    const session = await getSession();
    userId = resolveUserId(session);
    if (!userId) {
      return trackRouteResponse(ROUTE, "PATCH", context, jsonWithRequestId({ error: "Unauthorized" }, context, { status: 401 }));
    }

    const body = await request.json().catch(() => ({}));
    const parsed = MarkReadSchema.safeParse(body);
    if (!parsed.success) {
      logRouteEvent("[notifications] mark_read invalid", "info", context, { userId });
      return trackRouteResponse(
        ROUTE,
        "PATCH",
        context,
        jsonWithRequestId({ error: "Payload inválido", details: parsed.error.flatten() }, context, { status: 400 }),
        { actorUserId: userId }
      );
    }

    const data = await markNotificationsRead(userId, parsed.data);
    logRouteEvent("[notifications] mark_read ok", "info", context, { userId, updated: data.updated });
    return trackRouteResponse(ROUTE, "PATCH", context, jsonWithRequestId({ data }, context), { actorUserId: userId });
  } catch (error) {
    logRouteEvent("[notifications] mark_read failed", "error", context, {
      userId,
      error: error instanceof Error ? error.message : "unknown"
    });
    return trackRouteResponse(
      ROUTE,
      "PATCH",
      context,
      jsonWithRequestId({ error: "Erro ao atualizar notificações" }, context, { status: 500 }),
      { actorUserId: userId }
    );
  }
}
