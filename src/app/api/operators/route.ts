import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const operators = await prisma.operador.findMany({
      where: { is_active: true },
      include: { mesa_trabalho: true },
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json(operators);
  } catch (error) {
    console.error("Error fetching operators:", error);
    return NextResponse.json({ error: "Failed to fetch operators" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senha, ...rest } = body;
    
    const hashedPassword = await bcrypt.hash(senha || "mudar123", 10);

    const operator = await prisma.operador.create({
      data: {
        ...rest,
        senha_hash: hashedPassword,
        is_active: true
      }
    });
    return NextResponse.json(operator, { status: 201 });
  } catch (error) {
    console.error("Error creating operator:", error);
    return NextResponse.json({ error: "Failed to create operator" }, { status: 500 });
  }
}
