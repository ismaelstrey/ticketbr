import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/server/services/customer-context";

export async function GET() {
  try {
    await requireCustomerContext();
    const categories = await prisma.categoria_Ticket.findMany({
      where: { status: true, deleted_at: null },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, descricao: true }
    });
    return NextResponse.json({
      data: categories.map((c) => ({ id: c.id, name: c.nome, description: c.descricao }))
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

