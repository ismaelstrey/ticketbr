import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureChatConversationFinalizedColumn } from "@/server/services/chat-conversation-schema";

export async function POST(request: NextRequest) {
  try {
    await ensureChatConversationFinalizedColumn();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const contactId = String(body?.contactId ?? "").trim();
    const channel = String(body?.channel ?? "").trim();

    if (!contactId || !channel) {
      return NextResponse.json({ error: "contactId e channel são obrigatórios" }, { status: 400 });
    }

    const target = await prisma.chatConversation.findFirst({
      where: {
        contactId,
        channel,
        finalized: true,
        nextStartedAt: null
      },
      orderBy: { closedAt: "desc" }
    });

    if (!target) {
      return NextResponse.json({ data: null });
    }

    const updated = await prisma.chatConversation.update({
      where: { id: target.id },
      data: { nextStartedAt: new Date() }
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error marking chat conversation start", error);
    return NextResponse.json({ error: "Erro ao marcar início de nova conversa" }, { status: 500 });
  }
}

