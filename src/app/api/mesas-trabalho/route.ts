import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const mesas = await prisma.mesa_Trabalho.findMany({
      where: { status: true },
      include: { responsavel: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(mesas);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch workbenches" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mesa = await prisma.mesa_Trabalho.create({
      data: body,
    });
    return NextResponse.json(mesa, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create workbench" }, { status: 500 });
  }
}
