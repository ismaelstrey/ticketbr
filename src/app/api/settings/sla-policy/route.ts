import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPoliticaGlobal, upsertPoliticaGlobal } from "@/server/services/contract-service";
import { requireAdminSession, requireStaffSession } from "@/server/services/staff-context";
import { SlaPolicySchema } from "../../contratos/schemas";
import { contratoErrorResponse } from "../../contratos/helpers";

/** Política global de SLA (fallback para empresas sem contrato). */
export async function GET() {
  try {
    await requireStaffSession();
    const politica = await getPoliticaGlobal();
    return NextResponse.json({ data: politica });
  } catch (error) {
    return contratoErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => ({}));
    const input = SlaPolicySchema.parse(body);

    const politica = await upsertPoliticaGlobal(input, { id: session.userId });
    return NextResponse.json({ data: politica });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    }
    return contratoErrorResponse(error);
  }
}
