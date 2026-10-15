import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardStaff } from "@/server/services/staff-context";

export async function GET() {
  // Somente staff autenticado (ADMIN/AGENT) pode listar tipos de ticket
  const unauthorized = await guardStaff();
  if (unauthorized) return unauthorized;

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
