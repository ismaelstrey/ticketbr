import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/server/services/chat-service";
import { normalizeInboundPayload } from "@/server/services/chat-inbound-normalizer";
import { logWebhookRequest } from "@/server/services/webhook-request-logs";

export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = await req.json();
    const normalized = normalizeInboundPayload(body);

    if (normalized.kind === "ignored") {
      logWebhookRequest({ request: req, payload: body, route: "chat.inbound", source: normalized.source, status: 400 });
      return NextResponse.json({ error: normalized.reason }, { status: 400 });
    }

    if (normalized.kind === "message_update") {
      await chatService.updateMessageStatus(normalized.statusUpdate.waMessageId, normalized.statusUpdate.status);
      logWebhookRequest({ request: req, payload: body, route: "chat.inbound", source: normalized.source, status: 200 });
      return NextResponse.json({ success: true, kind: normalized.kind });
    }

    const response = await chatService.processInboundMessage(normalized.payload);
    logWebhookRequest({ request: req, payload: body, route: "chat.inbound", source: normalized.source, status: 200 });
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error processing inbound message:", error);
    logWebhookRequest({ request: req, payload: body, route: "chat.inbound", source: "webhook", status: 500 });
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
