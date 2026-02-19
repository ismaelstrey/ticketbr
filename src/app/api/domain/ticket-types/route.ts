import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const types = await prisma.tipo_Ticket.findMany({
      where: { status: true },
      include: {
        categorias: {
          where: { status: true },
          select: { id: true, nome: true }
        }
      }
    });
    return NextResponse.json(types);
  } catch (error) {
    console.error("Error fetching ticket types:", error);
    return NextResponse.json({ error: "Failed to fetch ticket types" }, { status: 500 });
  }
}
