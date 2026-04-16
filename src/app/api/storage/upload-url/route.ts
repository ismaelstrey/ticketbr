import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getStorageConfigFromDatabase } from "@/server/services/storage-settings";
import { createStorageAdapter } from "@/server/services/storage/storage-factory";
import { writeAuditLog } from "@/server/services/audit-log";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await getStorageConfigFromDatabase();
  if (!config) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const key = String(body?.key ?? "").trim();
  const contentType = String(body?.contentType ?? "application/octet-stream").trim();
  const expiresInSeconds = Number(body?.expiresInSeconds ?? 60);
  const acl = body?.acl === "public-read" ? "public-read" : "private";

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const adapter = createStorageAdapter(config);
  const url = await adapter.getSignedUploadUrl({
    key,
    contentType,
    acl,
    expiresInSeconds: Number.isFinite(expiresInSeconds) ? expiresInSeconds : 60
  });

  await writeAuditLog({
    action: "storage_upload_url",
    entity: "storage",
    entityId: config.bucket,
    actorUserId: (session as any).id ? String((session as any).id) : undefined,
    metadata: { key, contentType, expiresInSeconds: Number.isFinite(expiresInSeconds) ? expiresInSeconds : 60 }
  });

  return NextResponse.json({ data: { url } });
}
