import { NextRequest, NextResponse } from "next/server";
import {
  clearWebhookRequestLogs,
  listWebhookRequestLogs,
  WebhookRequestLogFilters
} from "@/server/services/webhook-request-logs";
import { writeAuditLog } from "@/server/services/audit-log";
import { enforceAdminRouteSecurity, withRateLimitHeaders } from "@/server/services/sensitive-route-guard";

// Converte os parâmetros da query em filtros válidos para a listagem
function parseFilters(request: NextRequest): WebhookRequestLogFilters {
  const params = request.nextUrl.searchParams;

  const limit = Number(params.get("limit"));
  const status = Number(params.get("status"));
  const since = params.get("since") ? new Date(String(params.get("since"))) : null;
  const okParam = params.get("ok");

  return {
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : undefined,
    route: params.get("route") || undefined,
    source: params.get("source") || undefined,
    status: Number.isFinite(status) ? status : undefined,
    ok: okParam === "true" ? true : okParam === "false" ? false : undefined,
    since: since && !Number.isNaN(since.getTime()) ? since : undefined
  };
}

export async function GET(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.webhook_logs.read");
  if (!guard.ok) {
    return guard.response;
  }

  const logs = await listWebhookRequestLogs(parseFilters(request));
  return withRateLimitHeaders(NextResponse.json({ data: logs }), guard.rate);
}

export async function DELETE(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.webhook_logs.clear");
  if (!guard.ok) {
    return guard.response;
  }

  await clearWebhookRequestLogs();
  await writeAuditLog({
    actorUserId: guard.actorUserId,
    action: "webhook_logs_clear",
    entity: "webhook_request_log"
  });
  return withRateLimitHeaders(NextResponse.json({ ok: true }), guard.rate);
}
