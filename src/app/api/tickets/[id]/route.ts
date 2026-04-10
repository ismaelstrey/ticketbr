import { NextRequest, NextResponse } from "next/server";
import { deleteTicket, getTicketById, updateTicket } from "@/server/services/ticket-service";
import { getSession } from "@/lib/auth";
import { UpdateTicketSchema } from "@/lib/validations/ticket";
import { z } from "zod";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
  const startedAt = Date.now();
  try {
    const ticket = await getTicketById(id);

    if (!ticket) {
      console.info("[tickets/get] not_found", { requestId, id, ms: Date.now() - startedAt });
      return NextResponse.json({ error: "Ticket não encontrado.", requestId }, { status: 404, headers: { "x-request-id": requestId } });
    }

    console.info("[tickets/get] ok", { requestId, id, ms: Date.now() - startedAt });
    return NextResponse.json({ data: ticket, requestId }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    console.error("[tickets/get] failed", { requestId, id, ms: Date.now() - startedAt, error });
    return NextResponse.json({ error: "Erro ao buscar ticket.", requestId }, { status: 500, headers: { "x-request-id": requestId } });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
  const startedAt = Date.now();
  try {
    const body = await request.json().catch(() => ({} as any));
    const parsed = UpdateTicketSchema.safeParse(body);
    if (!parsed.success) {
      console.info("[tickets/patch] validation_error", { requestId, id, ms: Date.now() - startedAt });
      return NextResponse.json(
        { error: "Erro de validação", details: z.treeifyError(parsed.error), requestId },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    const session = await getSession();
    const authorName = (session?.name as string | undefined) ?? parsed.data?.operador;
    const payload = { ...parsed.data, operador: authorName };

    const ticket = await updateTicket(id, payload);

    if (!ticket) {
      console.info("[tickets/patch] not_found", { requestId, id, ms: Date.now() - startedAt });
      return NextResponse.json({ error: "Ticket não encontrado.", requestId }, { status: 404, headers: { "x-request-id": requestId } });
    }

    console.info("[tickets/patch] ok", { requestId, id, ms: Date.now() - startedAt });
    return NextResponse.json({ data: ticket, requestId }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    console.error("[tickets/patch] failed", { requestId, id, ms: Date.now() - startedAt, error });
    return NextResponse.json({ error: "Erro ao atualizar ticket.", requestId }, { status: 500, headers: { "x-request-id": requestId } });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
  const startedAt = Date.now();
  try {
    const success = await deleteTicket(id);

    if (!success) {
      console.info("[tickets/delete] not_found", { requestId, id, ms: Date.now() - startedAt });
      return NextResponse.json({ error: "Ticket não encontrado.", requestId }, { status: 404, headers: { "x-request-id": requestId } });
    }

    console.info("[tickets/delete] ok", { requestId, id, ms: Date.now() - startedAt });
    return NextResponse.json({ message: "Ticket removido com sucesso.", requestId }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    console.error("[tickets/delete] failed", { requestId, id, ms: Date.now() - startedAt, error });
    return NextResponse.json({ error: "Erro ao remover ticket.", requestId }, { status: 500, headers: { "x-request-id": requestId } });
  }
}
