import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { vincularContrato } from "@/server/services/contract-service";
import { requireAdminSession } from "@/server/services/staff-context";
import { ContratoVincularSchema } from "../../schemas";
import { contratoErrorResponse } from "../../helpers";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { solicitanteId } = ContratoVincularSchema.parse(body);

    const contrato = await vincularContrato(id, solicitanteId, { id: session.userId });
    return NextResponse.json({ data: contrato });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Informe o solicitante a vincular." }, { status: 400 });
    }
    return contratoErrorResponse(error);
  }
}
