import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cancelarContrato } from "@/server/services/contract-service";
import { notifyContractCancelled } from "@/server/services/notifications";
import { requireAdminSession } from "@/server/services/staff-context";
import { ContratoCancelarSchema } from "../../schemas";
import { contratoErrorResponse } from "../../helpers";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { motivo } = ContratoCancelarSchema.parse(body);

    const contrato = await cancelarContrato(id, motivo, { id: session.userId });

    // Aviso de cancelamento é best-effort: nunca impede a resposta do cancelamento
    await notifyContractCancelled({
      contrato: {
        id: contrato.id,
        numero: contrato.numero,
        titulo: contrato.titulo,
        solicitante_id: contrato.solicitante_id,
        solicitanteNome: contrato.solicitante?.nome_fantasia || contrato.solicitante?.razao_social || null
      },
      motivo
    }).catch(() => {});

    return NextResponse.json({ data: contrato });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Informe o motivo do cancelamento (mínimo 3 caracteres)." },
        { status: 400 }
      );
    }
    return contratoErrorResponse(error);
  }
}
