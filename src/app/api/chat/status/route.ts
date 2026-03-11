import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/server/services/chat-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wa_message_id, status } = body;

    console.log("Received status update:", body);

    if (!wa_message_id || !status) {
      return NextResponse.json(
        { error: "Invalid payload: wa_message_id or status missing" },
        { status: 400 }
      );
    }

    await chatService.updateMessageStatus(wa_message_id, status);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating status:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
