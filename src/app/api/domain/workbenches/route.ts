import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const workbenches = await prisma.mesa_Trabalho.findMany({
      where: { status: true },
      include: {
        operadores: {
          where: { is_active: true },
          select: { id: true, nome: true }
        }
      }
    });
    return NextResponse.json(workbenches);
  } catch (error) {
    console.error("Error fetching workbenches:", error);
    return NextResponse.json({ error: "Failed to fetch workbenches" }, { status: 500 });
  }
}
