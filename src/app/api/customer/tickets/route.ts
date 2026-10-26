import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { getPortalStatusCopy, getPortalStatusKey } from "@/lib/tickets/portal-status-taxonomy";
import { requireCustomerContext } from "@/server/services/customer-context";
import { writeAuditLog } from "@/server/services/audit-log";
import { notifyTicketCreated } from "@/server/services/customer-notifications";
import { computeCustomerSla } from "@/lib/customerPortal";
import { resolveSlaDoTicket } from "@/server/services/contract-service";
import { trackRouteResponse } from "@/server/services/route-metrics-observability";

const ROUTE = "/api/customer/tickets";

const CreateTicketSchema = z.object({
  subject: z.string().min(3),
  description: z.string().min(3),
  categoriaId: z.string().min(1),
  priority: z.enum(["HIGH", "MEDIUM", "NONE"]).default("NONE")
});

export async function GET(request: NextRequest) {
  const context = createRequestContext();
  let actorUserId: string | null = null;
  let solicitanteId: string | null = null;

  try {
    const ctx = await requireCustomerContext();
    actorUserId = ctx.user.id;
    solicitanteId = ctx.solicitante.id;
    const q = String(request.nextUrl.searchParams.get("q") || "").trim();
    const status = String(request.nextUrl.searchParams.get("status") || "").trim();
    const priority = String(request.nextUrl.searchParams.get("priority") || "").trim();
    const categoryId = String(request.nextUrl.searchParams.get("categoryId") || "").trim();
    const preset = String(request.nextUrl.searchParams.get("preset") || "").trim();
    const from = String(request.nextUrl.searchParams.get("from") || "").trim();
    const to = String(request.nextUrl.searchParams.get("to") || "").trim();

    const where: any = {
      solicitante_id: ctx.solicitante.id,
      deleted_at: null
    };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (categoryId) {
      where.categoria_id = categoryId;
    }

    const now = new Date();
    const dateRange = (() => {
      if (preset === "today") {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { gte: start, lte: now };
      }
      if (preset === "7d" || preset === "30d") {
        const start = new Date(now);
        start.setDate(start.getDate() - (preset === "30d" ? 30 : 7));
        return { gte: start, lte: now };
      }
      if (preset === "custom" && from && to) {
        const start = new Date(from);
        const end = new Date(to);
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
          return start <= end ? { gte: start, lte: end } : { gte: end, lte: start };
        }
      }
      return null;
    })();

    if (dateRange) {
      where.createdAt = dateRange;
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
        responseSlaAt: true,
        solutionSlaAt: true,
        createdAt: true,
        updatedAt: true,
        categoria: { select: { id: true, nome: true } }
      }
    });

    logRouteEvent("[customer.tickets] list ok", "info", context, {
      solicitanteId,
      count: tickets.length
    });

    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId(
        {
          data: tickets.map((t) => ({
            id: t.id,
            number: t.number,
            subject: t.subject,
            description: t.description,
            status: t.status,
            portalStatusKey: getPortalStatusKey(t.status),
            portalStatus: getPortalStatusCopy(t.status),
            priority: t.priority,
            sla: computeCustomerSla(t),
            responseSlaAt: t.responseSlaAt,
            solutionSlaAt: t.solutionSlaAt,
            category: t.categoria ? { id: t.categoria.id, name: t.categoria.nome } : null,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
          }))
        },
        context
      ),
      { actorUserId, solicitanteId }
    );
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    logRouteEvent("[customer.tickets] list failed", "warn", context, { status });
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId({ error: status === 403 ? "Forbidden" : "Unauthorized" }, context, { status }),
      { actorUserId, solicitanteId }
    );
  }
}

export async function POST(request: NextRequest) {
  const context = createRequestContext();
  let actorUserId: string | null = null;
  let solicitanteId: string | null = null;

  try {
    const ctx = await requireCustomerContext();
    actorUserId = ctx.user.id;
    solicitanteId = ctx.solicitante.id;
    const body = await request.json().catch(() => ({}));
    const input = CreateTicketSchema.parse(body);

    const categoria = await prisma.categoria_Ticket.findUnique({
      where: { id: input.categoriaId },
      select: { id: true, nome: true, tipo_ticket_id: true }
    });

    if (!categoria) {
      logRouteEvent("[customer.tickets] create invalid_category", "warn", context, { solicitanteId });
      return trackRouteResponse(
        ROUTE,
        "POST",
        context,
        jsonWithRequestId({ error: "Categoria inválida" }, context, { status: 400 }),
        { actorUserId, solicitanteId }
      );
    }

    const tipoTicketSla = categoria.tipo_ticket_id
      ? await prisma.tipo_Ticket.findUnique({
          where: { id: categoria.tipo_ticket_id },
          select: { sla_horas: true }
        })
      : null;

    // Snapshot do SLA resolvido (tipo de ticket → contrato → política → padrão)
    const createdAt = new Date();
    const sla = await resolveSlaDoTicket({
      createdAt,
      tipoTicketSlaHours: tipoTicketSla?.sla_horas ?? null,
      tipoTicketId: categoria.tipo_ticket_id,
      categoriaId: categoria.id,
      priority: input.priority,
      solicitanteId: ctx.solicitante.id
    });

    const ticket = await prisma.ticket.create({
      data: {
        solicitante_id: ctx.solicitante.id,
        subject: input.subject,
        description: input.description,
        categoria_id: categoria.id,
        tipo_ticket_id: categoria.tipo_ticket_id,
        status: "TODO",
        priority: input.priority,
        createdByUserId: ctx.user.id,
        createdAt,
        ...(sla.contratoId ? { contrato_id: sla.contratoId } : {}),
        slaFonte: sla.fonte,
        foraDeContrato: sla.foraDeContrato,
        ...(sla.foraDeContrato ? {} : { slaHorasAplicadas: sla.horas, solutionSlaAt: sla.deadline }),
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

    logRouteEvent("[customer.tickets] create ok", "info", context, {
      solicitanteId,
      ticketId: ticket.id
    });

    return trackRouteResponse(
      ROUTE,
      "POST",
      context,
      jsonWithRequestId({ data: ticket }, context, { status: 201 }),
      { actorUserId, solicitanteId, metadata: { ticketId: ticket.id } }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logRouteEvent("[customer.tickets] create validation_error", "warn", context, { solicitanteId });
      return trackRouteResponse(
        ROUTE,
        "POST",
        context,
        jsonWithRequestId({ error: "Payload inválido", details: error.flatten() }, context, { status: 400 }),
        { actorUserId, solicitanteId }
      );
    }
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    logRouteEvent("[customer.tickets] create failed", "error", context, { status });
    return trackRouteResponse(
      ROUTE,
      "POST",
      context,
      jsonWithRequestId(
        { error: status === 500 ? "Erro interno" : status === 403 ? "Forbidden" : "Unauthorized" },
        context,
        { status }
      ),
      { actorUserId, solicitanteId }
    );
  }
}
