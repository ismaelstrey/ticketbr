import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tipos = await prisma.tipo_Ticket.findMany({
      where: { status: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(tipos);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch types" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tipo = await prisma.tipo_Ticket.create({
      data: body,
    });
    return NextResponse.json(tipo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create type" }, { status: 500 });
  }
}
