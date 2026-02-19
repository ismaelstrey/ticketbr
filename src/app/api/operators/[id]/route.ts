import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { id } = params;
    const { senha, ...rest } = body;

    const data: any = { ...rest };
    if (senha) {
      data.senha_hash = await bcrypt.hash(senha, 10);
    }

    const operator = await prisma.operador.update({
      where: { id },
      data
    });
    return NextResponse.json(operator);
  } catch (error) {
    console.error("Error updating operator:", error);
    return NextResponse.json({ error: "Failed to update operator" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await prisma.operador.update({
      where: { id },
      data: { is_active: false, deleted_at: new Date() }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting operator:", error);
    return NextResponse.json({ error: "Failed to delete operator" }, { status: 500 });
  }
}
