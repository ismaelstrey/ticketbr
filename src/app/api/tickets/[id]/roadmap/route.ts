import { NextRequest, NextResponse } from "next/server";
import { getTicketRoadmap } from "@/server/services/ticket-service";
import { guardStaff } from "@/server/services/staff-context";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Somente staff autenticado (ADMIN/AGENT) pode consultar o roadmap do ticket
  const unauthorized = await guardStaff();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const roadmap = await getTicketRoadmap(id);

  if (!roadmap) {
    return NextResponse.json({ error: "Ticket não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ data: roadmap });
}
