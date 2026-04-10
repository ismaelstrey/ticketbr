import { NextRequest, NextResponse } from "next/server";
import { changeTicketStatus } from "@/server/services/ticket-service";
import { getSession } from "@/lib/auth";
import { UiStatus } from "@/server/ticket-mappers";
import { Prisma } from "@/lib/prisma";

const acceptedStatuses: UiStatus[] = ["todo", "doing", "paused", "done"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
  const startedAt = Date.now();
  const body = await request.json().catch(() => ({} as any));
  const status = body?.status as UiStatus;

  if (!acceptedStatuses.includes(status)) {
    console.info("[tickets/status] invalid_status", { requestId, id, status, ms: Date.now() - startedAt });
    return NextResponse.json({ error: "Status inválido.", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  }

  if (status === "paused" && !body?.pauseReason) {
    console.info("[tickets/status] missing_pause_reason", { requestId, id, ms: Date.now() - startedAt });
    return NextResponse.json(
      { error: "Motivo da pausa é obrigatório para status pausado.", requestId },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  const session = await getSession();
  const author = (session?.name as string | undefined) ?? body?.author ?? "Sistema";

  try {
    const ticket = await changeTicketStatus(id, status, author, body?.pauseReason, Boolean(body?.pauseSla));

    if (!ticket) {
      console.info("[tickets/status] not_found", { requestId, id, ms: Date.now() - startedAt });
      return NextResponse.json({ error: "Ticket não encontrado.", requestId }, { status: 404, headers: { "x-request-id": requestId } });
    }

    console.info("[tickets/status] ok", { requestId, id, status, ms: Date.now() - startedAt });
    return NextResponse.json({ data: ticket, requestId }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021" || error.code === "P2022") {
        console.error("[tickets/status] prisma_schema_error", { requestId, id, code: error.code, ms: Date.now() - startedAt });
        return NextResponse.json(
          { error: "Banco de dados sem migrations necessárias para atualizar status", requestId },
          { status: 500, headers: { "x-request-id": requestId } }
        );
      }
    }
    console.error("[tickets/status] failed", { requestId, id, ms: Date.now() - startedAt, error });
    return NextResponse.json({ error: "Erro ao atualizar status", requestId }, { status: 500, headers: { "x-request-id": requestId } });
  }
}
