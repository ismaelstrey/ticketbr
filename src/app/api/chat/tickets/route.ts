import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { trackRouteResponse } from "@/server/services/route-metrics-observability";
import { guardStaff } from "@/server/services/staff-context";
import { isMissingPauseColumnsError, mapChatTicketSummary } from "@/server/services/ticket-service";

const ROUTE = "/api/chat/tickets";

// Campos usados para derivar prioridade e progresso de SLA no chat.
const chatTicketSelect = {
  id: true,
  number: true,
  subject: true,
  solicitante_id: true,
  priority: true,
  status: true,
  createdAt: true,
  foraDeContrato: true,
  slaHorasAplicadas: true,
  solutionSlaAt: true,
  pausedTotalSeconds: true,
  pauseSla: true,
  pausedStartedAt: true,
  solicitante: { select: { id: true, nome_fantasia: true, razao_social: true } },
  tipo_ticket: { select: { sla_horas: true } }
} as const;

// Projeção alternativa quando a base ainda não possui as colunas de pausa de SLA.
const chatTicketCompatSelect = {
  id: true,
  number: true,
  subject: true,
  solicitante_id: true,
  priority: true,
  status: true,
  createdAt: true,
  solutionSlaAt: true,
  solicitante: { select: { id: true, nome_fantasia: true, razao_social: true } },
  tipo_ticket: { select: { sla_horas: true } }
} as const;


export async function GET(request: NextRequest) {
  // Garante que apenas staff (ADMIN/AGENT) acesse os tickets usados no chat
  const unauthorized = await guardStaff();
  if (unauthorized) return unauthorized;

  const context = createRequestContext();

  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim();
    const companyName = request.nextUrl.searchParams.get("companyName")?.trim();

    if (!companyId && !companyName) {
      logRouteEvent("[chat.tickets] skipped", "info", context, { reason: "no_filters" });
      return trackRouteResponse(
        ROUTE,
        "GET",
        context,
        jsonWithRequestId({ data: [] }, context)
      );
    }

    const orConditions: any[] = [];

    if (companyName) {
      orConditions.push({ solicitante: { is: { nome_fantasia: { equals: companyName, mode: "insensitive" as const } } } });
      orConditions.push({ solicitante: { is: { razao_social: { equals: companyName, mode: "insensitive" as const } } } });
    }

    if (companyId) {
      orConditions.push({ solicitante_id: companyId });

      const solicitante = await prisma.solicitante.findUnique({
        where: { id: companyId },
        select: { nome_fantasia: true, razao_social: true }
      });

      const nomeFantasia = solicitante?.nome_fantasia?.trim();
      const razaoSocial = solicitante?.razao_social?.trim();

      if (nomeFantasia) {
        orConditions.push({ solicitante: { is: { nome_fantasia: { equals: nomeFantasia, mode: "insensitive" as const } } } });
      }
      if (razaoSocial) {
        orConditions.push({ solicitante: { is: { razao_social: { equals: razaoSocial, mode: "insensitive" as const } } } });
      }
    }

    const where = orConditions.length ? { OR: orConditions } : undefined;

    const query = (select: typeof chatTicketSelect | typeof chatTicketCompatSelect) =>
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        select: select as any
      });

    let tickets: any[];
    try {
      tickets = await query(chatTicketSelect);
    } catch (error) {
      if (!isMissingPauseColumnsError(error)) throw error;
      logRouteEvent("[chat.tickets] compat fallback", "warn", context, { reason: "missing_pause_columns" });
      tickets = await query(chatTicketCompatSelect);
    }

    logRouteEvent("[chat.tickets] ok", "info", context, { count: tickets.length });
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId(
        {
          data: tickets.map(mapChatTicketSummary)
        },
        context
      )
    );
  } catch (error) {
    console.error("Error loading chat tickets", error);
    logRouteEvent("[chat.tickets] failed", "error", context, {
      error: error instanceof Error ? error.message : "unknown"
    });
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId({ error: "Erro ao carregar tickets" }, context, { status: 500 })
    );
  }
}
