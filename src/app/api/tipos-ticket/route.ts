import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/server/services/staff-context";

export async function GET() {
  // Somente administradores podem listar tipos de ticket
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const tipos = await prisma.tipo_Ticket.findMany({
      where: { status: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(tipos);
  } catch {
    return NextResponse.json({ error: "Failed to fetch types" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Somente administradores podem criar tipos de ticket
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const tipo = await prisma.tipo_Ticket.create({
      data: body,
    });
    return NextResponse.json(tipo, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create type" }, { status: 500 });
  }
}
