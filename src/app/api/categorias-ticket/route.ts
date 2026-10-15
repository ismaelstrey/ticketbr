import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/server/services/staff-context";

export async function GET() {
  // Somente administradores podem listar categorias de ticket
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const categorias = await prisma.categoria_Ticket.findMany({
      where: { status: true },
      include: { tipo_ticket: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(categorias);
  } catch {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Somente administradores podem criar categorias de ticket
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const categoria = await prisma.categoria_Ticket.create({
      data: body,
    });
    return NextResponse.json(categoria, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
