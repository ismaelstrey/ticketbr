import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getStorageConfigFromDatabase } from "@/server/services/storage-settings";
import { createStorageAdapter } from "@/server/services/storage/storage-factory";
import { writeAuditLog } from "@/server/services/audit-log";

export async function GET(request: NextRequest) {
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

  const prefix = request.nextUrl.searchParams.get("prefix") ?? "";
  const maxKeys = Number(request.nextUrl.searchParams.get("maxKeys") ?? "50");
  const adapter = createStorageAdapter(config);

  const items = await adapter.listObjects({ prefix: prefix || undefined, maxKeys: Number.isFinite(maxKeys) ? maxKeys : 50 });
  await writeAuditLog({
    action: "storage_list",
    entity: "storage",
    entityId: config.bucket,
    actorUserId: (session as any).id ? String((session as any).id) : undefined,
    metadata: { prefix: prefix || null, count: items.length }
  });

  return NextResponse.json({ data: items });
}
