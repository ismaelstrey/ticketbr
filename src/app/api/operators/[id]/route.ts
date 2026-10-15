import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { guardAdmin } from "@/server/services/staff-context";

// Projeção segura do operador: nunca expõe o hash de senha ao cliente
const publicOperadorSelect = {
  id: true,
  nome: true,
  email: true,
  is_active: true,
  mesa_trabalho_id: true,
  created_at: true
} as const;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Somente administradores podem atualizar operadores
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { id } = await params;
    const { senha, ...rest } = body;

    const data: any = { ...rest };
    if (senha) {
      data.senha_hash = await bcrypt.hash(senha, 10);
    }

    const operator = await prisma.operador.update({
      where: { id },
      data,
      select: publicOperadorSelect
    });
    return NextResponse.json(operator);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }
    console.error("Error updating operator:", error);
    return NextResponse.json({ error: "Failed to update operator" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Somente administradores podem excluir operadores
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    await prisma.operador.update({
      where: { id },
      data: { is_active: false, deleted_at: new Date() }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }
    console.error("Error deleting operator:", error);
    return NextResponse.json({ error: "Failed to delete operator" }, { status: 500 });
  }
}
