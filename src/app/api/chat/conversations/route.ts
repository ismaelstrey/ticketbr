import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const contactId = request.nextUrl.searchParams.get("contactId") ?? undefined;
    const channel = request.nextUrl.searchParams.get("channel") ?? undefined;

    const data = await prisma.chatConversation.findMany({
      where: {
        ...(contactId ? { contactId } : {}),
        ...(channel ? { channel } : {})
      },
      include: {
        ticket: {
          select: {
            id: true,
            number: true,
            subject: true
          }
        }
      },
      orderBy: { closedAt: "desc" },
      take: 200
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error listing archived chat conversations", error);
    return NextResponse.json({ error: "Erro ao carregar conversas finalizadas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body?.contactId || !body?.channel || !Array.isArray(body?.messages)) {
      return NextResponse.json({ error: "contactId, channel e messages são obrigatórios" }, { status: 400 });
    }

    const session = await getSession();

    const created = await prisma.chatConversation.create({
      data: {
        contactId: String(body.contactId),
        contactName: String(body.contactName || "Contato"),
        channel: String(body.channel),
        conversationId: String(body.conversationId || `${body.channel}:${body.contactId}`),
        ticketId: body.ticketId ? String(body.ticketId) : undefined,
        messages: body.messages,
        createdBy: (session?.name as string | undefined) || "Sistema"
      },
      include: {
        ticket: {
          select: {
            id: true,
            number: true,
            subject: true
          }
        }
      }
    });


    if (created.ticketId) {
      await prisma.ticketEvent.create({
        data: {
          ticketId: created.ticketId,
          type: "NOTE",
          title: "Conversa finalizada no chat",
          description: `Conversa ${created.conversationId} finalizada e salva no histórico`,
          author: (session?.name as string | undefined) || "Sistema",
          metadata: {
            chatConversationId: created.id,
            contactId: created.contactId,
            channel: created.channel,
            closedAt: created.closedAt.toISOString()
          }
        }
      });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating archived chat conversation", error);
    return NextResponse.json({ error: "Erro ao finalizar conversa" }, { status: 500 });
  }
}
