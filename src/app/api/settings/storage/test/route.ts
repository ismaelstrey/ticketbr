import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createStorageAdapter } from "@/server/services/storage/storage-factory";
import { normalizeStorageConfig } from "@/server/services/storage-settings";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const config = normalizeStorageConfig(body);
  if (!config) {
    return NextResponse.json({ error: "Invalid storage config" }, { status: 400 });
  }

  const adapter = createStorageAdapter(config);
  const validation = await adapter.validate();
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

