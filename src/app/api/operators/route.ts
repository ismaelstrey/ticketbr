import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
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
    const operators = await prisma.operador.findMany({
      where: { is_active: true },
      include: { mesa_trabalho: true },
      orderBy: { nome: "asc" }
    });
    return NextResponse.json(operators);
  } catch (error) {
    console.error("Error fetching operators:", error);
    return NextResponse.json({ error: "Failed to fetch operators" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Somente staff autenticado (ADMIN/AGENT) pode criar operadores
  const unauthorized = await guardStaff();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { senha, ...rest } = body;

    const hashedPassword = await bcrypt.hash(senha || "mudar123", 10);

    const operator = await prisma.operador.create({
      data: {
        ...rest,
        senha_hash: hashedPassword,
        is_active: true
      },
      select: publicOperadorSelect
    });
    return NextResponse.json(operator, { status: 201 });
  } catch (error) {
    console.error("Error creating operator:", error);
    return NextResponse.json({ error: "Failed to create operator" }, { status: 500 });
  }
}
