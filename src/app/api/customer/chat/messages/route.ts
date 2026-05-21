import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/server/services/customer-context";
import { chatService } from "@/server/services/chat-service";

function buildPortalConversationId(memberId: string) {
  return `portal:${memberId}`;
}

async function ensureCustomerConversation(memberId: string) {
  return chatService.findOrCreateConversation(buildPortalConversationId(memberId), "portal");
}

export async function GET() {
  try {
    const ctx = await requireCustomerContext();
    const conversation = await ensureCustomerConversation(ctx.member.id);

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 200,
      select: {
        id: true,
        direction: true,
        type: true,
        body: true,
        mediaUrl: true,
        mimetype: true,
        status: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      data: messages.map((message) => ({
        id: message.id,
        contactId: conversation.waChatId,
        channel: "portal",
        direction: message.direction,
        text: message.body ?? undefined,
        message: message.body ?? undefined,
        attachment: message.mediaUrl
          ? { url: message.mediaUrl, mimeType: message.mimetype ?? undefined, name: "Midia" }
          : undefined,
        type: message.type,
        status: message.status,
        createdAt: message.createdAt.toISOString()
      })),
      meta: {
        conversationId: conversation.id,
        contactId: conversation.waChatId,
        assignedTo: conversation.assignedTo,
        humanActive: conversation.humanActive,
        botActive: conversation.botActive
      }
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro ao carregar mensagens" : "Unauthorized" }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireCustomerContext();
    const body = await request.json().catch(() => ({}));
    const text = String(body?.text || "").trim();

    if (!text) {
      return NextResponse.json({ error: "Mensagem obrigatoria" }, { status: 400 });
    }

    const conversation = await ensureCustomerConversation(ctx.member.id);
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: "open",
        humanActive: Boolean(conversation.assignedTo),
        botActive: !conversation.assignedTo,
        lastMessageAt: new Date()
      }
    });

    const { message } = await chatService.saveMessage({
      waMessageId: `portal:${crypto.randomUUID()}`,
      conversationId: conversation.id,
      direction: "in",
      type: "text",
      body: text,
      mediaUrl: null,
      mimetype: null,
      status: "delivered"
    });

    return NextResponse.json({
      data: {
        id: message.id,
        contactId: conversation.waChatId,
        channel: "portal",
        direction: "in",
        text: message.body,
        status: message.status,
        createdAt: message.createdAt.toISOString()
      }
    }, { status: 201 });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro ao enviar mensagem" : "Unauthorized" }, { status });
  }
}
