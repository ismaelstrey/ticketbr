import { NextRequest } from "next/server";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { guardAdmin } from "@/server/services/staff-context";
import { captureDailySnapshot } from "@/server/services/kpi-snapshots";

// Valida o segredo do scheduler (CRON_SECRET) enviado via header Authorization/x-cron-secret
function hasValidCronSecret(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const rawHeader = request.headers.get("authorization") || request.headers.get("x-cron-secret") || "";
  const token = rawHeader.toLowerCase().startsWith("bearer ") ? rawHeader.slice(7) : rawHeader;
  return token.trim() === secret;
}

/**
 * Captura o snapshot diário de KPIs gerenciais.
 * Acesso por CRON_SECRET (scheduler) ou sessão de administrador.
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext();

  if (!hasValidCronSecret(request)) {
    const unauthorized = await guardAdmin();
    if (unauthorized) return unauthorized;
  }

  try {
    const snapshot = await captureDailySnapshot();
    const data = {
      snapshotDate: snapshot.snapshotDate.toISOString(),
      openTotal: snapshot.openTotal,
      doneTotal: snapshot.doneTotal,
      overdueTotal: snapshot.overdueTotal,
      slaWarningTotal: snapshot.slaWarningTotal
    };
    logRouteEvent("[cron.kpi-snapshot] ok", "info", context, data);
    return jsonWithRequestId({ data }, context);
  } catch (error) {
    logRouteEvent("[cron.kpi-snapshot] failed", "error", context, {
      error: error instanceof Error ? error.message : "unknown"
    });
    return jsonWithRequestId({ error: "Erro ao capturar snapshot de KPIs" }, context, { status: 500 });
  }
}
