import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/server/services/staff-context";

export async function GET() {
  // Somente administradores podem listar mesas de trabalho
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const mesas = await prisma.mesa_Trabalho.findMany({
      where: { status: true },
      include: { responsavel: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(mesas);
  } catch {
    return NextResponse.json({ error: "Failed to fetch workbenches" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Somente administradores podem criar mesas de trabalho
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const mesa = await prisma.mesa_Trabalho.create({
      data: body,
    });
    return NextResponse.json(mesa, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create workbench" }, { status: 500 });
  }
}
