import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const solicitantes = await prisma.solicitante.findMany({
      where: { status: true },
      orderBy: { razao_social: "asc" },
    });
    return NextResponse.json(solicitantes);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch solicitantes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const solicitante = await prisma.solicitante.create({
      data: body,
    });
    return NextResponse.json(solicitante, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create solicitante" }, { status: 500 });
  }
}
