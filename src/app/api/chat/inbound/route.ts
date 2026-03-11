import { NextRequest, NextResponse } from "next/server";
import { chatService, InboundPayload } from "@/server/services/chat-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = body as InboundPayload;

    console.log("Received inbound message:", payload);

    if (!payload.wa_chat_id || !payload.wa_message_id) {
      return NextResponse.json(
        { error: "Invalid payload: wa_chat_id or wa_message_id missing" },
        { status: 400 }
      );
    }

    const response = await chatService.processInboundMessage(payload);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error processing inbound message:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
