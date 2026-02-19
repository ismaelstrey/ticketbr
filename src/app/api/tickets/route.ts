import { NextRequest, NextResponse } from "next/server";
import { createTicket, listTickets } from "@/server/services/ticket-service";
import { CreateTicketSchema } from "@/lib/validations/ticket";
import { z } from "zod";

export async function GET() {
  const tickets = await listTickets();

  return NextResponse.json({ data: tickets });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = CreateTicketSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Erro de validação", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const ticket = await createTicket(result.data);
    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
