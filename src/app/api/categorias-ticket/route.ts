import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categorias = await prisma.categoria_Ticket.findMany({
      where: { status: true },
      include: { tipo_ticket: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(categorias);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const categoria = await prisma.categoria_Ticket.create({
      data: body,
    });
    return NextResponse.json(categoria, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
