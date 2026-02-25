import { NextRequest, NextResponse } from "next/server";
import { deleteTicket, getTicketById, updateTicket } from "@/server/services/ticket-service";
import { getSession } from "@/lib/auth";

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
  const session = await getSession();
  const authorName = (session?.name as string | undefined) ?? body?.operador;
  const payload = { ...body, operador: authorName };

  const ticket = await updateTicket(id, payload);

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
