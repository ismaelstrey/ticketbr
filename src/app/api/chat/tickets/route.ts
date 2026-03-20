import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim();
    const companyName = request.nextUrl.searchParams.get("companyName")?.trim();

    const where = companyId
      ? { solicitante_id: companyId }
      : companyName
        ? {
            OR: [
              { company: { equals: companyName, mode: "insensitive" as const } },
              { solicitante: { is: { nome_fantasia: { equals: companyName, mode: "insensitive" as const } } } },
              { solicitante: { is: { razao_social: { equals: companyName, mode: "insensitive" as const } } } }
            ]
          }
        : undefined;

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        number: true,
        subject: true,
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
      data: tickets.map((ticket) => ({
        id: ticket.id,
        number: ticket.number,
        subject: ticket.subject,
        companyId: ticket.solicitante?.id ?? ticket.solicitante_id ?? null,
        companyName: ticket.solicitante?.nome_fantasia || ticket.solicitante?.razao_social || ticket.company || null
      }))
    });
  } catch (error) {
    console.error("Error loading chat tickets", error);
    return NextResponse.json({ error: "Erro ao carregar tickets" }, { status: 500 });
  }
}
