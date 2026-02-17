import { NextRequest, NextResponse } from "next/server";
import { createTicket, listTickets } from "@/server/services/ticket-service";

export async function GET() {
  const tickets = await listTickets();
  return NextResponse.json({ data: tickets });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body?.empresa || !body?.solicitante || !body?.assunto) {
    return NextResponse.json(
      { error: "Campos obrigatórios: empresa, solicitante e assunto." },
      { status: 400 }
    );
  }

  const ticket = await createTicket(body);
  return NextResponse.json({ data: ticket }, { status: 201 });
}
