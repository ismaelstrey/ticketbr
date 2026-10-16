import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/server/services/audit-log";
import {
  getNotificationPreferences,
  saveNotificationPreferences
} from "@/server/services/notification-preferences";
import { enforceAdminRouteSecurity, withRateLimitHeaders } from "@/server/services/sensitive-route-guard";

export async function GET(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.notification_preferences.read");
  if (!guard.ok) {
    return guard.response;
  }

  const preferences = await getNotificationPreferences();
  return withRateLimitHeaders(NextResponse.json({ data: preferences }), guard.rate);
}

export async function POST(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.notification_preferences.write");
  if (!guard.ok) {
    return guard.response;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return withRateLimitHeaders(NextResponse.json({ error: "Preferências inválidas" }, { status: 400 }), guard.rate);
  }

  const preferences = await saveNotificationPreferences(body);
  await writeAuditLog({
    actorUserId: guard.actorUserId,
    action: "notification_preferences_update",
    entity: "notification_preferences",
    metadata: {
      inAppEnabled: preferences.inAppEnabled,
      emailEnabled: preferences.emailEnabled,
      disabledTypes: Object.entries(preferences.types)
        .filter(([, enabled]) => !enabled)
        .map(([tipo]) => tipo)
    }
  });

  return withRateLimitHeaders(NextResponse.json({ data: preferences }), guard.rate);
}
