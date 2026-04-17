import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createStorageAdapter } from "@/server/services/storage/storage-factory";
import { normalizeStorageConfig } from "@/server/services/storage-settings";
import { writeAuditLog } from "@/server/services/audit-log";
import { enforceAdminRouteSecurity, withRateLimitHeaders } from "@/server/services/sensitive-route-guard";

export async function POST(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.storage.test");
  if (!guard.ok) {
    return guard.response;
  }

  const body = await request.json().catch(() => null);
  const config = normalizeStorageConfig(body);
  if (!config) {
    return withRateLimitHeaders(NextResponse.json({ error: "Invalid storage config" }, { status: 400 }), guard.rate);
  }

  const adapter = createStorageAdapter(config);
  const validation = await adapter.validate();

  await writeAuditLog({
    action: "storage_config_test",
    entity: "storage",
    actorUserId: guard.actorUserId ?? undefined,
    metadata: {
      provider: config.provider,
      region: config.region,
      bucket: config.bucket,
      ok: validation.ok,
      error: validation.ok ? null : validation.error
    }
  });

  if (!validation.ok) {
    return withRateLimitHeaders(NextResponse.json({ ok: false, error: validation.error }, { status: 400 }), guard.rate);
  }

  return withRateLimitHeaders(NextResponse.json({ ok: true }), guard.rate);
}
