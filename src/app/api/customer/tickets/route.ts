import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPortalStatusCopy, getPortalStatusKey } from "@/lib/tickets/portal-status-taxonomy";
import { requireCustomerContext } from "@/server/services/customer-context";
import { writeAuditLog } from "@/server/services/audit-log";
import { notifyTicketCreated } from "@/server/services/customer-notifications";

const CreateTicketSchema = z.object({
  subject: z.string().min(3),
  description: z.string().min(3),
  categoriaId: z.string().min(1),
  priority: z.enum(["HIGH", "MEDIUM", "NONE"]).default("NONE")
});

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireCustomerContext();
    const q = String(request.nextUrl.searchParams.get("q") || "").trim();
    const status = String(request.nextUrl.searchParams.get("status") || "").trim();

    const where: any = {
      solicitante_id: ctx.solicitante.id,
      deleted_at: null
    };

    if (status) {
      where.status = status;
    }

    if (q) {
      where.OR = [
        { subject: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } }
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        number: true,
        subject: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        categoria: { select: { id: true, nome: true } }
      }
    });

    return NextResponse.json({
      data: tickets.map((t) => ({
        id: t.id,
        number: t.number,
        subject: t.subject,
        description: t.description,
        status: t.status,
        portalStatusKey: getPortalStatusKey(t.status),
        portalStatus: getPortalStatusCopy(t.status),
        priority: t.priority,
        category: t.categoria ? { id: t.categoria.id, name: t.categoria.nome } : null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }))
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireCustomerContext();
    const body = await request.json().catch(() => ({}));
    const input = CreateTicketSchema.parse(body);

    const categoria = await prisma.categoria_Ticket.findUnique({
      where: { id: input.categoriaId },
      select: { id: true, nome: true, tipo_ticket_id: true }
    });

    if (!categoria) {
      return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        solicitante_id: ctx.solicitante.id,
        company: ctx.solicitante.nome_fantasia || ctx.solicitante.razao_social,
        requester: ctx.user.name,
        subject: input.subject,
        description: input.description,
        categoria_id: categoria.id,
        category: categoria.nome,
        tipo_ticket_id: categoria.tipo_ticket_id,
        status: "TODO",
        priority: input.priority,
        createdByUserId: ctx.user.id,
        events: {
          create: {
            type: "CREATED",
            title: "Ticket criado",
            description: "Ticket criado via portal do cliente",
            toStatus: "TODO",
            author: ctx.user.name,
            authorId: ctx.user.id
          }
        }
      },
      select: { id: true, number: true, subject: true }
    });

    await writeAuditLog({
      solicitanteId: ctx.solicitante.id,
      actorUserId: ctx.user.id,
      action: "ticket.create",
      entity: "ticket",
      entityId: ticket.id,
      metadata: { ticketNumber: ticket.number }
    });

    const recipients = [ctx.solicitante.email, ctx.user.email].filter(Boolean);
    await notifyTicketCreated({
      to: recipients,
      ticketNumber: ticket.number,
      subject: ticket.subject,
      companyName: ctx.solicitante.nome_fantasia || ctx.solicitante.razao_social,
      ticketId: ticket.id
    });

    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.flatten() }, { status: 400 });
    }
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}
