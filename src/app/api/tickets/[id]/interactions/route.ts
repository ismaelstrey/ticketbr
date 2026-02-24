import { NextRequest, NextResponse } from "next/server";
import { addTicketInteraction } from "@/server/services/ticket-service";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (!body?.title) {
    return NextResponse.json({ error: "Título da interação é obrigatório." }, { status: 400 });
  }

  const session = await getSession();
  const author = (session?.name as string | undefined) ?? body.author ?? "Sistema";

  const ticket = await addTicketInteraction(id, {
    title: body.title,
    description: body.description,
    author,
    type: body.type
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ data: ticket }, { status: 201 });
}
