import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { removerTermo, updateTermo } from "@/server/services/contract-service";
import { requireAdminSession } from "@/server/services/staff-context";
import { ContratoTermoUpdateSchema } from "../../../schemas";
import { contratoErrorResponse } from "../../../helpers";

type Params = { params: Promise<{ id: string; termoId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { termoId } = await params;
    const body = await request.json().catch(() => ({}));
    const input = ContratoTermoUpdateSchema.parse(body);

    const termo = await updateTermo(termoId, input, { id: session.userId });
    return NextResponse.json({ data: termo });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    }
    return contratoErrorResponse(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { termoId } = await params;

    const termo = await removerTermo(termoId, { id: session.userId });
    return NextResponse.json({ data: termo });
  } catch (error) {
    return contratoErrorResponse(error);
  }
}
