import { NextRequest } from "next/server";
import { createTicket, listTickets } from "@/server/services/ticket-service";
import { CreateTicketSchema } from "@/lib/validations/ticket";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";

export async function GET(_request: NextRequest) {
  const context = createRequestContext();
  try {
    const tickets = await listTickets();
    logRouteEvent("[tickets/list] ok", "info", context, { count: tickets.length });
    return jsonWithRequestId({ data: tickets }, context);
  } catch (error) {
    logRouteEvent("[tickets/list] failed", "error", context, { error });
    return jsonWithRequestId({ error: "Erro ao listar tickets." }, context, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = createRequestContext();
  try {
    const body = await request.json().catch(() => ({} as any));
    const result = CreateTicketSchema.safeParse(body);

    if (!result.success) {
      logRouteEvent("[tickets/create] validation_error", "info", context);
      return jsonWithRequestId({ error: "Erro de validação", details: z.treeifyError(result.error) }, context, { status: 400 });
    }

    const session = await getSession();
    const payload = {
      ...result.data,
      operador: result.data.operador ?? ((session?.name as string | undefined) ?? "Sistema"),
    };

    const ticket = await createTicket(payload);
    logRouteEvent("[tickets/create] ok", "info", context, { id: ticket.id });
    return jsonWithRequestId({ data: ticket }, context, { status: 201 });
  } catch (error) {
    logRouteEvent("[tickets/create] failed", "error", context, { error });
    return jsonWithRequestId({ error: "Erro interno do servidor" }, context, { status: 500 });
  }
}
