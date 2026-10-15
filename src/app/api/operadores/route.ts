import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardStaff } from "@/server/services/staff-context";

// Projeção segura do operador: nunca expõe o hash de senha ao cliente
const publicOperadorSelect = {
  id: true,
  nome: true,
  email: true,
  is_active: true,
  mesa_trabalho_id: true,
  created_at: true
} as const;

export async function GET() {
  // Somente staff autenticado (ADMIN/AGENT) pode listar operadores
  const unauthorized = await guardStaff();
  if (unauthorized) return unauthorized;

  try {
    const operadores = await prisma.operador.findMany({
      where: { is_active: true },
      orderBy: { nome: "asc" },
      select: publicOperadorSelect
    });
    return NextResponse.json(operadores);
  } catch {
    return NextResponse.json({ error: "Failed to fetch operators" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Somente ADMIN pode criar operadores
  const unauthorized = await guardStaff();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const operador = await prisma.operador.create({
      data: body,
      select: publicOperadorSelect
    });
    return NextResponse.json(operador, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create operator" }, { status: 500 });
  }
}
