import { NextRequest, NextResponse } from "next/server";
import { clearWebhookRequestLogs, listWebhookRequestLogs } from "@/server/services/webhook-request-logs";
import { writeAuditLog } from "@/server/services/audit-log";
import { enforceAdminRouteSecurity, withRateLimitHeaders } from "@/server/services/sensitive-route-guard";

export async function GET(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.webhook_logs.read");
  if (!guard.ok) {
    return guard.response;
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") || "100");
  return withRateLimitHeaders(NextResponse.json({ data: listWebhookRequestLogs(limit) }), guard.rate);
}

export async function DELETE(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.webhook_logs.clear");
  if (!guard.ok) {
    return guard.response;
  }

  clearWebhookRequestLogs();
  await writeAuditLog({
    actorUserId: guard.actorUserId,
    action: "webhook_logs_clear",
    entity: "webhook_request_log"
  });
  return withRateLimitHeaders(NextResponse.json({ ok: true }), guard.rate);
}
