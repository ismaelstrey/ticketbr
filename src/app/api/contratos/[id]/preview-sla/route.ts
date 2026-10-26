import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { previewSla } from "@/server/services/contract-service";
import { requireStaffSession } from "@/server/services/staff-context";
import { SlaPreviewSchema } from "../../schemas";
import { contratoErrorResponse } from "../../helpers";

type Params = { params: Promise<{ id: string }> };

/** Simula a resolução do SLA para um contexto de ticket, sem persistir nada. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireStaffSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = SlaPreviewSchema.parse(body);

    const resultado = await previewSla(id, {
      tipoTicketId: input.tipoTicketId,
      categoriaId: input.categoriaId,
      priority: input.prioridade,
      tipoTicketSlaHours: input.tipoTicketSlaHours
    });

    return NextResponse.json({ data: resultado });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    }
    return contratoErrorResponse(error);
  }
}
