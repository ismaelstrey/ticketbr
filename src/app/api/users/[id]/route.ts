import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { guardAdmin } from "@/server/services/staff-context";

// Projeção segura do usuário: nunca expõe o hash de senha ao cliente
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  whatsappId: true,
  pushName: true,
  profilePicUrl: true,
  instanceId: true
} as const;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Somente administradores podem atualizar usuários
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { id } = await params;
    const { password, ...rest } = body;

    const data: any = { ...rest };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: publicUserSelect
    });
    return NextResponse.json(user);
  } catch (error: any) {
    // Usuário inexistente => 404
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Somente administradores podem excluir usuários
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    await prisma.user.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Usuário inexistente => 404
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
