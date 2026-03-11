import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wa_message_id, stable_url } = body;

    console.log("Received media-ready update:", body);

    if (!wa_message_id || !stable_url) {
      return NextResponse.json(
        { error: "Invalid payload: wa_message_id or stable_url missing" },
        { status: 400 }
      );
    }

    await prisma.message.update({
      where: { waMessageId: wa_message_id },
      data: { mediaUrl: stable_url },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating media:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
