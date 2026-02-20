import { NextRequest, NextResponse } from "next/server";
import { changeTicketStatus } from "@/server/services/ticket-service";
import { getSession } from "@/lib/auth";
import { UiStatus } from "@/server/ticket-mappers";

const acceptedStatuses: UiStatus[] = ["todo", "doing", "paused", "done"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const status = body?.status as UiStatus;

  if (!acceptedStatuses.includes(status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  if (status === "paused" && !body?.pauseReason) {
    return NextResponse.json({ error: "Motivo da pausa é obrigatório para status pausado." }, { status: 400 });
  }

  const session = await getSession();
  const author = (session?.name as string | undefined) ?? body?.author ?? "Sistema";

  const ticket = await changeTicketStatus(id, status, author, body?.pauseReason);

  if (!ticket) {
    return NextResponse.json({ error: "Ticket não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ data: ticket });
}
