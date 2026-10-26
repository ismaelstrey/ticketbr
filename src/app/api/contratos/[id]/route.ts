import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getContrato,
  removerContrato,
  updateContrato,
  type UpdateContratoInput
} from "@/server/services/contract-service";
import { requireAdminSession, requireStaffSession } from "@/server/services/staff-context";
import { ContratoUpdateSchema } from "../schemas";
import { contratoErrorResponse, toDate } from "../helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireStaffSession();
    const { id } = await params;

    const contrato = await getContrato(id);
    if (!contrato) {
      return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ data: contrato });
  } catch (error) {
    return contratoErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = ContratoUpdateSchema.parse(body);

    const { inicioVigencia, fimVigencia, ...rest } = input;
    const data: UpdateContratoInput = {
      ...rest,
      ...(inicioVigencia !== undefined ? { inicioVigencia: toDate(inicioVigencia) as Date } : {}),
      ...(fimVigencia !== undefined ? { fimVigencia: toDate(fimVigencia) } : {})
    };

    const contrato = await updateContrato(id, data, { id: session.userId });
    return NextResponse.json({ data: contrato });
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
    const { id } = await params;

    const contrato = await removerContrato(id, { id: session.userId });
    return NextResponse.json({ data: contrato });
  } catch (error) {
    return contratoErrorResponse(error);
  }
}
