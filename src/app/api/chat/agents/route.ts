import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error("Error fetching chat agents", error);
    return NextResponse.json({ error: "Erro ao carregar atendentes" }, { status: 500 });
  }
}
