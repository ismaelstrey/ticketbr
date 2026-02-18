import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const operadores = await prisma.operador.findMany({
      where: { is_active: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(operadores);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch operators" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const operador = await prisma.operador.create({
      data: body,
    });
    return NextResponse.json(operador, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create operator" }, { status: 500 });
  }
}
