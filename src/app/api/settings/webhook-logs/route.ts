import { NextRequest, NextResponse } from "next/server";
import { clearWebhookRequestLogs, listWebhookRequestLogs } from "@/server/services/webhook-request-logs";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") || "100");
  return NextResponse.json({ data: listWebhookRequestLogs(limit) });
}

export async function DELETE() {
  clearWebhookRequestLogs();
  return NextResponse.json({ ok: true });
}
