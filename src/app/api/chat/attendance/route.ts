import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { chatService } from "@/server/services/chat-service";

function normalizeWaChatId(value: string) {
  return value.trim();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body?.action || "").trim();
    const waChatId = normalizeWaChatId(String(body?.waChatId || body?.contactId || ""));
    const currentUserId = String(session.id);
    const currentUserName = String(session.name || "Atendente");

    if (!waChatId || !["claim", "transfer"].includes(action)) {
      return NextResponse.json({ error: "waChatId e action válidos são obrigatórios" }, { status: 400 });
    }

    let conversation = await prisma.conversation.findUnique({ where: { waChatId } });
    if (!conversation && action === "claim") {
      conversation = await chatService.findOrCreateConversation(waChatId);
    }

    if (!conversation) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    if (action === "claim") {
      if (conversation.assignedTo && conversation.assignedTo !== currentUserId) {
        const assignedUser = await prisma.user.findUnique({
          where: { id: conversation.assignedTo },
          select: { name: true }
        });
        return NextResponse.json({
          error: `Esta conversa já está em atendimento por ${assignedUser?.name || "outro atendente"}`
        }, { status: 409 });
      }

      const updated = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          assignedTo: currentUserId,
          humanActive: true,
          botActive: false,
          status: "open"
        }
      });

      return NextResponse.json({
        data: {
          conversationId: updated.id,
          assignedTo: currentUserId,
          assignedUserName: currentUserName,
          humanActive: updated.humanActive,
          botActive: updated.botActive
        }
      });
    }

    if (conversation.assignedTo !== currentUserId) {
      return NextResponse.json({ error: "Apenas o atendente responsável pode transferir esta conversa" }, { status: 403 });
    }

    const targetUserId = String(body?.targetUserId || "").trim();
    if (!targetUserId) {
      return NextResponse.json({ error: "Selecione o atendente de destino" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Atendente de destino não encontrado" }, { status: 404 });
    }

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        assignedTo: targetUser.id,
        humanActive: true,
        botActive: false,
        status: "open"
      }
    });

    return NextResponse.json({
      data: {
        conversationId: updated.id,
        assignedTo: targetUser.id,
        assignedUserName: targetUser.name,
        humanActive: updated.humanActive,
        botActive: updated.botActive
      }
    });
  } catch (error) {
    console.error("Error handling chat attendance", error);
    return NextResponse.json({ error: "Erro ao atualizar atendimento da conversa" }, { status: 500 });
  }
}
