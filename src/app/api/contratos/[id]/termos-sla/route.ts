import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTermo, listTermos } from "@/server/services/contract-service";
import { requireAdminSession, requireStaffSession } from "@/server/services/staff-context";
import { ContratoTermoSchema } from "../../schemas";
import { contratoErrorResponse } from "../../helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireStaffSession();
    const { id } = await params;

    const termos = await listTermos(id);
    return NextResponse.json({ data: termos });
  } catch (error) {
    return contratoErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = ContratoTermoSchema.parse(body);

    const termo = await createTermo(id, input, { id: session.userId });
    return NextResponse.json({ data: termo }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    }
    return contratoErrorResponse(error);
  }
}
