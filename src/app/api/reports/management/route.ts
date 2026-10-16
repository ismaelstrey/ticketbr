import { NextRequest } from "next/server";
import { z } from "zod";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { guardStaff } from "@/server/services/staff-context";
import { getManagementReport } from "@/server/services/kpi-snapshots";
import { trackRouteResponse } from "@/server/services/route-metrics-observability";

const ROUTE = "/api/reports/management";

const QuerySchema = z.object({
  preset: z.enum(["today", "7d", "30d", "custom"]).optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

export async function GET(request: NextRequest) {
  const context = createRequestContext();

  // Relatório gerencial é restrito à sessão de staff (ADMIN/AGENT)
  const denied = await guardStaff();
  if (denied) {
    return trackRouteResponse(ROUTE, "GET", context, denied);
  }

  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    logRouteEvent("[reports/management] invalid_query", "warn", context);
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId({ error: "Parâmetros inválidos" }, context, { status: 400 })
    );
  }

  try {
    const result = await getManagementReport(parsed.data);
    logRouteEvent("[reports/management] ok", "info", context, { trendPoints: result.data.trend.length });
    return trackRouteResponse(ROUTE, "GET", context, jsonWithRequestId(result, context));
  } catch (error) {
    logRouteEvent("[reports/management] failed", "error", context, {
      error: error instanceof Error ? error.message : "unknown"
    });
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId({ error: "Erro ao gerar relatório gerencial" }, context, { status: 500 })
    );
  }
}
