import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPriorityChipLabel, getSlaChipLabel, getSlaToneFromProgress } from "@/lib/tickets/sla-chip";

function getSlaProgress(createdAt: Date, responseSlaAt: Date | null): number {
  if (!responseSlaAt) return 0;
  const totalWindowMs = responseSlaAt.getTime() - createdAt.getTime();
  if (totalWindowMs <= 0) return 100;
  const elapsedMs = Date.now() - createdAt.getTime();
  const progress = (elapsedMs / totalWindowMs) * 100;
  return Math.max(0, Math.round(progress));
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim();
    const companyName = request.nextUrl.searchParams.get("companyName")?.trim();

    if (!companyId && !companyName) {
      return NextResponse.json({ data: [] });
    }

    const orConditions: any[] = [];

    if (companyName) {
      orConditions.push({ company: { equals: companyName, mode: "insensitive" as const } });
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
        orConditions.push({ company: { equals: nomeFantasia, mode: "insensitive" as const } });
      }
      if (razaoSocial) {
        orConditions.push({ company: { equals: razaoSocial, mode: "insensitive" as const } });
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
        priority: true,
        createdAt: true,
        responseSlaAt: true,
        company: true,
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

    return NextResponse.json({
      data: tickets.map((ticket) => {
        const slaProgress = getSlaProgress(ticket.createdAt, ticket.responseSlaAt);
        return {
          slaProgress,
          slaLabel: getSlaChipLabel(getSlaToneFromProgress(slaProgress)),
          priorityLabel: getPriorityChipLabel(ticket.priority),
          id: ticket.id,
          number: ticket.number,
          subject: ticket.subject,
          companyId: ticket.solicitante?.id ?? ticket.solicitante_id ?? null,
          companyName: ticket.solicitante?.nome_fantasia || ticket.solicitante?.razao_social || ticket.company || null
        };
      })
    });
  } catch (error) {
    console.error("Error loading chat tickets", error);
    return NextResponse.json({ error: "Erro ao carregar tickets" }, { status: 500 });
  }
}
