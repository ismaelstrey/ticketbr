import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/server/services/audit-log";
import { createStorageAdapter } from "@/server/services/storage/storage-factory";
import { getStorageConfigFromDatabase, normalizeStorageConfig, sanitizeStorageConfig, saveStorageConfigToDatabase, type StorageRuntimeConfig } from "@/server/services/storage-settings";

function keepSecret(value: string) {
  return value.includes("•");
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await getStorageConfigFromDatabase();
  return NextResponse.json({ data: config ? sanitizeStorageConfig(config) : null });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const normalized = normalizeStorageConfig(body);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid storage config" }, { status: 400 });
  }

  const previous = await getStorageConfigFromDatabase();
  const merged: StorageRuntimeConfig = {
    ...normalized,
    accessKeyId: keepSecret(normalized.accessKeyId) ? (previous?.accessKeyId ?? "") : normalized.accessKeyId,
    secretAccessKey: keepSecret(normalized.secretAccessKey) ? (previous?.secretAccessKey ?? "") : normalized.secretAccessKey
  };

  const final = normalizeStorageConfig(merged);
  if (!final) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const adapter = createStorageAdapter(final);
  const validation = await adapter.validate();
  if (!validation.ok) {
    return NextResponse.json({ error: `Storage validation failed: ${validation.error}` }, { status: 400 });
  }

  await saveStorageConfigToDatabase(final);
  await writeAuditLog({
    action: "storage_config_update",
    entity: "storage",
    entityId: final.bucket,
    actorUserId: (session as any).id ? String((session as any).id) : undefined,
    metadata: { provider: final.provider, region: final.region, bucket: final.bucket, endpoint: final.endpoint ?? null }
  });

  return NextResponse.json({ data: sanitizeStorageConfig(final) });
}
