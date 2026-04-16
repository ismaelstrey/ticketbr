import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getStorageConfigFromDatabase } from "@/server/services/storage-settings";
import { createStorageAdapter } from "@/server/services/storage/storage-factory";
import { writeAuditLog } from "@/server/services/audit-log";

export async function DELETE(request: NextRequest) {
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

  const key = String(request.nextUrl.searchParams.get("key") ?? "").trim();
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const adapter = createStorageAdapter(config);
  await adapter.deleteObject(key);
  await writeAuditLog({
    action: "storage_delete",
    entity: "storage",
    entityId: config.bucket,
    actorUserId: (session as any).id ? String((session as any).id) : undefined,
    metadata: { key }
  });

  return NextResponse.json({ ok: true });
}
