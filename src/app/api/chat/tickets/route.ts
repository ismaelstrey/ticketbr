import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { trackRouteResponse } from "@/server/services/route-metrics-observability";
import { guardStaff } from "@/server/services/staff-context";

const ROUTE = "/api/chat/tickets";

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

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        number: true,
        subject: true,
        solicitante_id: true,
        solicitante: {
          select: {
            id: true,
            nome_fantasia: true,
            razao_social: true
          }
        }
      }
    });

    logRouteEvent("[chat.tickets] ok", "info", context, { count: tickets.length });
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId(
        {
          data: tickets.map((ticket) => ({
            id: ticket.id,
            number: ticket.number,
            subject: ticket.subject,
            companyId: ticket.solicitante?.id ?? ticket.solicitante_id ?? null,
            companyName: ticket.solicitante?.nome_fantasia || ticket.solicitante?.razao_social || null
          }))
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
