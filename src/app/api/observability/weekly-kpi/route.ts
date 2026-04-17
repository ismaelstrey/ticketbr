import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { getSession } from "@/lib/auth";
import { getWeeklyCriticalFlowKpis } from "@/server/services/critical-flow-observability";

export async function GET() {
  const context = createRequestContext();

  try {
    const session = await getSession();
    if (!session?.id) {
      return jsonWithRequestId({ error: "Unauthorized" }, context, { status: 401 });
    }

    const data = await getWeeklyCriticalFlowKpis();
    logRouteEvent("[observability.weekly-kpi] ok", "info", context, {
      actorUserId: session.id,
      totalEvents: data.totals.events
    });

    return jsonWithRequestId({ data }, context);
  } catch (error) {
    logRouteEvent("[observability.weekly-kpi] failed", "error", context, {
      error: error instanceof Error ? error.message : "unknown"
    });
    return jsonWithRequestId({ error: "Erro ao gerar KPI semanal" }, context, { status: 500 });
  }
}
