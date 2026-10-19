import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardStaff } from "@/server/services/staff-context";

// Retorna as opções de domínio (tipos, categorias, mesas e operadores) para o formulário do ticket
export async function GET() {
  const unauthorized = await guardStaff();
  if (unauthorized) return unauthorized;

  try {
    const [tipos, categorias, mesas, operadores] = await Promise.all([
      prisma.tipo_Ticket.findMany({
        where: { status: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true }
      }),
      prisma.categoria_Ticket.findMany({
        where: { status: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, tipo_ticket_id: true }
      }),
      prisma.mesa_Trabalho.findMany({
        where: { status: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true }
      }),
      prisma.operador.findMany({
        where: { is_active: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true }
      })
    ]);

    return NextResponse.json({ data: { tipos, categorias, mesas, operadores } });
  } catch {
    return NextResponse.json({ error: "Falha ao carregar opções" }, { status: 500 });
  }
}
