import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardStaff } from "@/server/services/staff-context";

export async function GET() {
  // Somente staff autenticado (ADMIN/AGENT) pode listar mesas de trabalho
  const unauthorized = await guardStaff();
  if (unauthorized) return unauthorized;

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
