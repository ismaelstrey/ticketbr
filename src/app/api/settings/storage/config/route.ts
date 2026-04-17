import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { writeAuditLog } from "@/server/services/audit-log";
import { createStorageAdapter } from "@/server/services/storage/storage-factory";
import { getStorageConfigFromDatabase, normalizeStorageConfig, sanitizeStorageConfig, saveStorageConfigToDatabase, type StorageRuntimeConfig } from "@/server/services/storage-settings";
import { enforceAdminRouteSecurity, withRateLimitHeaders } from "@/server/services/sensitive-route-guard";

function keepSecret(value: string) {
  return value.includes("•");
}

export async function GET(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.storage.config.read");
  if (!guard.ok) {
    return guard.response;
  }

  const config = await getStorageConfigFromDatabase();
  return withRateLimitHeaders(NextResponse.json({ data: config ? sanitizeStorageConfig(config) : null }), guard.rate);
}

export async function POST(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.storage.config.write");
  if (!guard.ok) {
    return guard.response;
  }

  const body = await request.json().catch(() => null);
  const normalized = normalizeStorageConfig(body);
  if (!normalized) {
    return withRateLimitHeaders(NextResponse.json({ error: "Invalid storage config" }, { status: 400 }), guard.rate);
  }

  const previous = await getStorageConfigFromDatabase();
  const merged: StorageRuntimeConfig = {
    ...normalized,
    accessKeyId: keepSecret(normalized.accessKeyId) ? (previous?.accessKeyId ?? "") : normalized.accessKeyId,
    secretAccessKey: keepSecret(normalized.secretAccessKey) ? (previous?.secretAccessKey ?? "") : normalized.secretAccessKey
  };

  const final = normalizeStorageConfig(merged);
  if (!final) {
    return withRateLimitHeaders(NextResponse.json({ error: "Missing credentials" }, { status: 400 }), guard.rate);
  }

  const adapter = createStorageAdapter(final);
  const validation = await adapter.validate();
  if (!validation.ok) {
    return withRateLimitHeaders(NextResponse.json({ error: `Storage validation failed: ${validation.error}` }, { status: 400 }), guard.rate);
  }

  await saveStorageConfigToDatabase(final);
  await writeAuditLog({
    action: "storage_config_update",
    entity: "storage",
    entityId: final.bucket,
    actorUserId: guard.actorUserId ?? undefined,
    metadata: { provider: final.provider, region: final.region, bucket: final.bucket, endpoint: final.endpoint ?? null }
  });

  return withRateLimitHeaders(NextResponse.json({ data: sanitizeStorageConfig(final) }), guard.rate);
}
