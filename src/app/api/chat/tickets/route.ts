import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        number: true,
        subject: true
      }
    });

    return NextResponse.json({ data: tickets });
  } catch (error) {
    console.error("Error loading chat tickets", error);
    return NextResponse.json({ error: "Erro ao carregar tickets" }, { status: 500 });
  }
}
