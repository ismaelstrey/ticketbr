import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { emitChatEventToN8n } from "@/server/services/n8n-adapter";
import { getWhatsAppConfigFromRequest } from "@/server/services/whatsapp-settings";

export async function GET(request: NextRequest) {
  const contactId = request.nextUrl.searchParams.get("contactId");

  try {
    const events = await prisma.ticketEvent.findMany({
      where: {
        type: "NOTE",
        title: "Chat vinculado ao ticket"
      },
      include: {
        ticket: {
          select: { id: true, number: true, subject: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 300
    });

    const data = events
      .map((event) => {
        const metadata = (event.metadata ?? {}) as Record<string, unknown>;
        return {
          id: event.id,
          ticketId: event.ticket.id,
          ticketNumber: event.ticket.number,
          ticketSubject: event.ticket.subject,
          contactId: String(metadata.contactId ?? ""),
          channel: String(metadata.channel ?? "whatsapp"),
          conversationId: String(metadata.conversationId ?? ""),
          createdAt: event.createdAt,
          author: event.author ?? "Sistema"
        };
      })
      .filter((item) => item.contactId && (!contactId || item.contactId === contactId));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error listing chat links", error);
    return NextResponse.json({ error: "Erro ao carregar vínculos de chat" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body?.ticketId || !body?.contactId || !body?.conversationId) {
      return NextResponse.json({ error: "ticketId, contactId e conversationId são obrigatórios" }, { status: 400 });
    }

    const session = await getSession();

    const config = getWhatsAppConfigFromRequest(request);

    const event = await prisma.ticketEvent.create({
      data: {
        ticketId: body.ticketId,
        type: "NOTE",
        title: "Chat vinculado ao ticket",
        description: `Conversa ${body.conversationId} vinculada ao ticket`,
        author: (session?.name as string | undefined) ?? "Sistema",
        metadata: {
          channel: body.channel ?? "whatsapp",
          contactId: body.contactId,
          conversationId: body.conversationId
        }
      }
    });

    await emitChatEventToN8n({
      type: "chat.ticket.linked",
      source: "ticketbr-chat",
      occurredAt: new Date().toISOString(),
      data: {
        ticketId: body.ticketId,
        contactId: body.contactId,
        channel: body.channel ?? "whatsapp",
        conversationId: body.conversationId
      }
    }, config);

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    console.error("Error creating chat link", error);
    return NextResponse.json({ error: "Erro ao associar chat ao ticket" }, { status: 500 });
  }
}
