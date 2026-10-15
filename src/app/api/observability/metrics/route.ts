import { NextRequest } from "next/server";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { getSession } from "@/lib/auth";
import { getOperationalRouteMetrics, trackRouteResponse } from "@/server/services/route-metrics-observability";

const ROUTE = "/api/observability/metrics";

export async function GET(request: NextRequest) {
  const context = createRequestContext();
  let actorUserId: string | null = null;

  try {
    const session = await getSession();
    if (!session?.id) {
      return trackRouteResponse(
        ROUTE,
        "GET",
        context,
        jsonWithRequestId({ error: "Unauthorized" }, context, { status: 401 })
      );
    }
    actorUserId = String(session.id);

    const hoursParam = Number(request.nextUrl.searchParams.get("hours"));
    const data = await getOperationalRouteMetrics(new Date(), Number.isFinite(hoursParam) ? hoursParam : 24);

    logRouteEvent("[observability.metrics] ok", "info", context, {
      actorUserId,
      requests: data.totals.requests,
      windowHours: data.windowHours
    });

    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId({ data }, context),
      { actorUserId }
    );
  } catch (error) {
    logRouteEvent("[observability.metrics] failed", "error", context, {
      actorUserId,
      error: error instanceof Error ? error.message : "unknown"
    });

    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId({ error: "Erro ao gerar métricas operacionais" }, context, { status: 500 }),
      { actorUserId }
    );
  }
}
