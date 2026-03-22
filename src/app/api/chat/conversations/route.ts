import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const contactId = request.nextUrl.searchParams.get("contactId") ?? undefined;
    const channel = request.nextUrl.searchParams.get("channel") ?? undefined;

    const data = await prisma.chatConversation.findMany({
      where: {
        finalized: true,
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
    const conversationId = String(body.conversationId || `${body.channel}:${body.contactId}`);
    const closedAt = new Date();

    const existing = await prisma.chatConversation.findFirst({
      where: {
        contactId: String(body.contactId),
        channel: String(body.channel),
        conversationId,
        finalized: false
      },
      orderBy: { closedAt: "desc" }
    });

    const persisted = existing
      ? await prisma.chatConversation.update({
          where: { id: existing.id },
          data: {
            contactName: String(body.contactName || existing.contactName || "Contato"),
            ticketId: body.ticketId ? String(body.ticketId) : null,
            messages: body.messages,
            finalized: true,
            createdBy: (session?.name as string | undefined) || existing.createdBy || "Sistema",
            closedAt
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
        })
      : await prisma.chatConversation.create({
          data: {
            contactId: String(body.contactId),
            contactName: String(body.contactName || "Contato"),
            channel: String(body.channel),
            conversationId,
            ticketId: body.ticketId ? String(body.ticketId) : undefined,
            messages: body.messages,
            finalized: true,
            createdBy: (session?.name as string | undefined) || "Sistema",
            closedAt
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

    if (persisted.ticketId) {
      await prisma.ticketEvent.create({
        data: {
          ticketId: persisted.ticketId,
          type: "NOTE",
          title: "Conversa finalizada no chat",
          description: `Conversa ${persisted.conversationId} finalizada e salva no histórico`,
          author: (session?.name as string | undefined) || "Sistema",
          metadata: {
            chatConversationId: persisted.id,
            contactId: persisted.contactId,
            channel: persisted.channel,
            closedAt: persisted.closedAt.toISOString()
          }
        }
      });
    }

    return NextResponse.json({ data: persisted }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Error creating archived chat conversation", error);
    return NextResponse.json({ error: "Erro ao finalizar conversa" }, { status: 500 });
  }
}
