import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renovarContrato, type RenovarContratoInput } from "@/server/services/contract-service";
import { requireAdminSession } from "@/server/services/staff-context";
import { ContratoRenovarSchema } from "../../schemas";
import { contratoErrorResponse, toDate } from "../../helpers";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = ContratoRenovarSchema.parse(body);

    const data: RenovarContratoInput = {
      numero: input.numero,
      inicioVigencia: toDate(input.inicioVigencia) ?? undefined,
      fimVigencia: toDate(input.fimVigencia),
      valorMensal: input.valorMensal,
      observacoes: input.observacoes
    };

    const contrato = await renovarContrato(id, data, { id: session.userId });
    return NextResponse.json({ data: contrato }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    }
    return contratoErrorResponse(error);
  }
}
