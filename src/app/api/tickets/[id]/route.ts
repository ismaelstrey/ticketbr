import { NextRequest, NextResponse } from "next/server";
import { deleteTicket, getTicketById, updateTicket } from "@/server/services/ticket-service";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicketById(id);

  if (!ticket) {
    return NextResponse.json({ error: "Ticket não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ data: ticket });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const ticket = await updateTicket(id, body);

  if (!ticket) {
    return NextResponse.json({ error: "Ticket não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ data: ticket });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const success = await deleteTicket(id);

  if (!success) {
    return NextResponse.json({ error: "Ticket não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ message: "Ticket removido com sucesso." });
}
