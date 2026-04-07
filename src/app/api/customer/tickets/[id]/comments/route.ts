import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/server/services/customer-context";
import { writeAuditLog } from "@/server/services/audit-log";
import { notifyTicketCommented } from "@/server/services/customer-notifications";

const CreateCommentSchema = z.object({
  message: z.string().min(1).max(8000)
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireCustomerContext();
    const { id } = await params;

    const ticket = await prisma.ticket.findFirst({
      where: { id, solicitante_id: ctx.solicitante.id, deleted_at: null },
      select: { id: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
    }

    const events = await prisma.ticketEvent.findMany({
      where: { ticketId: id, type: "COMMENT" },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({
      data: events.map((e: any) => ({
        id: e.id,
        author: e.author,
        authorId: e.authorId,
        message: e.description,
        createdAt: e.createdAt
      }))
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireCustomerContext();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = CreateCommentSchema.parse(body);

    const ticket = await prisma.ticket.findFirst({
      where: { id, solicitante_id: ctx.solicitante.id, deleted_at: null },
      select: { id: true, number: true, subject: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
    }

    const created = await prisma.ticketEvent.create({
      data: {
        ticketId: id,
        type: "COMMENT",
        title: "Comentário",
        description: input.message,
        author: ctx.user.name,
        authorId: ctx.user.id
      },
      select: { id: true, createdAt: true }
    });

    await writeAuditLog({
      solicitanteId: ctx.solicitante.id,
      actorUserId: ctx.user.id,
      action: "ticket.comment",
      entity: "ticket",
      entityId: ticket.id,
      metadata: { ticketNumber: ticket.number }
    });

    const recipients = [ctx.solicitante.email].filter(Boolean);
    await notifyTicketCommented({
      to: recipients,
      ticketNumber: ticket.number,
      subject: ticket.subject,
      author: ctx.user.name,
      message: input.message,
      ticketId: ticket.id
    });

    return NextResponse.json({ data: { id: created.id, createdAt: created.createdAt } }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.flatten() }, { status: 400 });
    }
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

