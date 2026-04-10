import { NextRequest, NextResponse } from "next/server";
import { createTicket, listTickets } from "@/server/services/ticket-service";
import { CreateTicketSchema } from "@/lib/validations/ticket";
import { z } from "zod";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const requestId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
  const startedAt = Date.now();
  try {
    const tickets = await listTickets();
    console.info("[tickets/list] ok", { requestId, count: tickets.length, ms: Date.now() - startedAt });
    return NextResponse.json({ data: tickets, requestId }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    console.error("[tickets/list] failed", { requestId, ms: Date.now() - startedAt, error });
    return NextResponse.json({ error: "Erro ao listar tickets.", requestId }, { status: 500, headers: { "x-request-id": requestId } });
  }
}

export async function POST(request: NextRequest) {
  const requestId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
  const startedAt = Date.now();
  try {
    const body = await request.json().catch(() => ({} as any));
    const result = CreateTicketSchema.safeParse(body);

    if (!result.success) {
      console.info("[tickets/create] validation_error", { requestId, ms: Date.now() - startedAt });
      return NextResponse.json(
        { error: "Erro de validação", details: z.treeifyError(result.error), requestId },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    const session = await getSession();
    const payload = {
      ...result.data,
      operador: result.data.operador ?? ((session?.name as string | undefined) ?? "Sistema"),
    };

    const ticket = await createTicket(payload);
    console.info("[tickets/create] ok", { requestId, id: ticket.id, ms: Date.now() - startedAt });
    return NextResponse.json({ data: ticket, requestId }, { status: 201, headers: { "x-request-id": requestId } });
  } catch (error) {
    console.error("[tickets/create] failed", { requestId, ms: Date.now() - startedAt, error });
    return NextResponse.json({ error: "Erro interno do servidor", requestId }, { status: 500, headers: { "x-request-id": requestId } });
  }
}
