import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Solicitantes vêm da tabela Solicitante (nova) ou, se não houver, pegamos strings únicas da tabela Ticket (legado)
    // Mas o schema tem tabela Solicitante. Vamos usar ela.
    const requesters = await prisma.solicitante.findMany({
      where: { status: true },
      select: { id: true, nome_fantasia: true, email: true }
    });
    return NextResponse.json(requesters);
  } catch (error) {
    console.error("Error fetching requesters:", error);
    return NextResponse.json({ error: "Failed to fetch requesters" }, { status: 500 });
  }
}
