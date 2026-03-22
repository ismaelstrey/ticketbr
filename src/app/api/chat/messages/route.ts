import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatService } from "@/server/services/chat-service";
import { resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";
import { sendOutboundMessage } from "@/server/services/chat-outbound";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const asInt = Math.floor(parsed);
  return asInt > 0 ? asInt : fallback;
}

function normalizeWaChatId(value: string) {
  const trimmed = value.trim();
  return trimmed;
}

export async function GET(request: NextRequest) {
  try {
    const contactId = request.nextUrl.searchParams.get("contactId");
    const conversationId = request.nextUrl.searchParams.get("conversationId");
    const waChatId = request.nextUrl.searchParams.get("waChatId");
    const cursor = request.nextUrl.searchParams.get("cursor");
    const limit = Math.min(parsePositiveInt(request.nextUrl.searchParams.get("limit"), 50), 200);

    const identifier = conversationId || waChatId || contactId;
    if (!identifier) {
      return NextResponse.json(
        { error: "Informe conversationId ou waChatId (ou contactId legado)." },
        { status: 400 }
      );
    }

    const conversation = identifier.includes("@")
      ? await prisma.conversation.findUnique({ where: { waChatId: normalizeWaChatId(identifier) } })
      : await prisma.conversation.findUnique({ where: { id: String(identifier) } });

    if (!conversation) {
      return NextResponse.json({
        data: [],
        meta: {
          totalMessages: 0,
          usersTotal: 0,
          conversationId: null,
          waChatId: identifier.includes("@") ? identifier : null
        },
        paging: { limit, cursor: null, nextCursor: null }
      });
    }

    const [totalMessages, directionCounts, messages] = await Promise.all([
      prisma.message.count({ where: { conversationId: conversation.id } }),
      prisma.message.groupBy({
        by: ["direction"],
        where: { conversationId: conversation.id },
        _count: { _all: true }
      }).catch(() => []),
      prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          waMessageId: true,
          direction: true,
          type: true,
          body: true,
          mediaUrl: true,
          mimetype: true,
          status: true,
          createdAt: true
        }
      })
    ]);

    const hasIn = (directionCounts as any[]).some((row) => row.direction === "in" && (row as any)?._count?._all > 0);
    const hasOut = (directionCounts as any[]).some((row) => row.direction === "out" && (row as any)?._count?._all > 0);
    const usersTotal = hasIn && hasOut ? 2 : (hasIn || hasOut ? 1 : 0);

    const mappedMessages = messages.map((msg) => ({
      id: msg.id,
      waMessageId: msg.waMessageId ?? undefined,
      contactId: conversation.waChatId,
      channel: "whatsapp",
      direction: msg.direction,
      text: msg.body ?? undefined,
      message: msg.body ?? undefined,
      attachment: msg.mediaUrl
        ? {
            url: msg.mediaUrl,
            mimeType: msg.mimetype ?? undefined,
            name: "Mídia"
          }
        : undefined,
      type: msg.type,
      status: msg.status,
      timestamp: msg.createdAt.toISOString(),
      createdAt: msg.createdAt.toISOString()
    }));

    const nextCursor = messages.length ? messages[messages.length - 1].id : null;

    return NextResponse.json({
      data: mappedMessages,
      meta: {
        totalMessages,
        usersTotal,
        conversationId: conversation.id,
        waChatId: conversation.waChatId,
        assignedTo: conversation.assignedTo ?? null
      },
      paging: { limit, cursor: cursor ?? null, nextCursor }
    });
  } catch (error: any) {
    console.error("Error listing messages:", error);
    return NextResponse.json({ error: "Erro ao listar mensagens" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, text, attachment, contactPhone } = body; // contactId aqui é o JID (wa_chat_id)

    if (!contactId) {
      return NextResponse.json({ error: "contactId (JID) é obrigatório" }, { status: 400 });
    }

    const config = await resolveWhatsAppConfig(request);

    let waMessageId = "";
    try {
      const outbound = await sendOutboundMessage({ contactId, text, attachment, contactPhone }, config);
      waMessageId = outbound.waMessageId;
    } catch (error: any) {
      const message = String(error?.message || "");
      const status =
        message.includes("não está configurado") ||
        message.includes("contactPhone é obrigatório") ||
        message.includes("Provider WhatsApp inválido")
          ? 400
          : message.includes("Falha ao enviar para N8N") || message.includes("n8n")
            ? 502
            : 500;
      return NextResponse.json({ error: message || "Erro ao enviar mensagem" }, { status });
    }

    const shouldPersist = Boolean(process.env.DATABASE_URL);
    if (shouldPersist) {
      const conversation = await chatService.findOrCreateConversation(contactId);
      const savedMessage = await chatService.saveMessage({
        waMessageId,
        conversationId: conversation.id,
        direction: "out",
        type: attachment ? (attachment.type || "image") : "text",
        body: text,
        mediaUrl: null,
        mimetype: attachment?.mimeType || null,
        status: "sent",
      });

      return NextResponse.json(
        {
          data: {
            id: savedMessage.id,
            text: savedMessage.body,
            createdAt: savedMessage.createdAt,
            direction: "out",
            status: "sent",
          },
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        data: {
          id: waMessageId,
          text: text ?? null,
          createdAt: new Date().toISOString(),
          direction: "out",
          status: "sent",
        },
      },
      { status: 201 },
    );

  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
