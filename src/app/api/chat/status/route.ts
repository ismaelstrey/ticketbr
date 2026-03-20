import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/server/services/chat-service";
import { logWebhookRequest } from "@/server/services/webhook-request-logs";

export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    body = await req.json();
    const { wa_message_id, status } = body;

    console.log("Received status update:", body);

    if (!wa_message_id || !status) {
      logWebhookRequest({ request: req, payload: body, route: "chat.status", source: "status-webhook", status: 400 });
      return NextResponse.json(
        { error: "Invalid payload: wa_message_id or status missing" },
        { status: 400 }
      );
    }

    await chatService.updateMessageStatus(wa_message_id, status);
    logWebhookRequest({ request: req, payload: body, route: "chat.status", source: "status-webhook", status: 200 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating status:", error);
    logWebhookRequest({ request: req, payload: body, route: "chat.status", source: "status-webhook", status: 500 });
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
