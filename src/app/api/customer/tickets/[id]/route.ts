import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalStatusCopy, getPortalStatusKey } from "@/lib/tickets/portal-status-taxonomy";
import { requireCustomerContext } from "@/server/services/customer-context";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireCustomerContext();
    const { id } = await params;

    const ticket = await prisma.ticket.findFirst({
      where: { id, solicitante_id: ctx.solicitante.id, deleted_at: null },
      include: {
        categoria: { select: { id: true, nome: true } },
        events: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
    }

    const comments = (ticket.events || [])
      .filter((e: any) => e.type === "COMMENT")
      .map((e: any) => ({
        id: e.id,
        author: e.author,
        authorId: e.authorId,
        message: e.description,
        createdAt: e.createdAt
      }));

    return NextResponse.json({
      data: {
        id: ticket.id,
        number: ticket.number,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        portalStatusKey: getPortalStatusKey(ticket.status),
        portalStatus: getPortalStatusCopy(ticket.status),
        priority: ticket.priority,
        category: ticket.categoria ? { id: ticket.categoria.id, name: ticket.categoria.nome } : null,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        comments
      }
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}
