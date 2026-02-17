import { NextRequest, NextResponse } from "next/server";
import { getTicketRoadmap } from "@/server/services/ticket-service";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roadmap = await getTicketRoadmap(id);

  if (!roadmap) {
    return NextResponse.json({ error: "Ticket não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ data: roadmap });
}
