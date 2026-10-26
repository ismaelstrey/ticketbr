import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createContrato, listContratos, type CreateContratoInput } from "@/server/services/contract-service";
import { requireAdminSession, requireStaffSession } from "@/server/services/staff-context";
import { ContratoCreateSchema, ContratoListQuerySchema } from "./schemas";
import { contratoErrorResponse, toDate } from "./helpers";

function toCreateInput(data: z.infer<typeof ContratoCreateSchema>): CreateContratoInput {
  return {
    ...data,
    inicioVigencia: toDate(data.inicioVigencia) as Date,
    fimVigencia: toDate(data.fimVigencia)
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireStaffSession();

    const sp = request.nextUrl.searchParams;
    const query = ContratoListQuerySchema.parse({
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      solicitanteId: sp.get("solicitanteId") ?? undefined,
      vigenteEm: sp.get("vigenteEm") ?? undefined,
      vencendoAte: sp.get("vencendoAte") ?? undefined,
      page: sp.get("page") ?? undefined,
      pageSize: sp.get("pageSize") ?? undefined
    });

    const { items, meta } = await listContratos({
      q: query.q,
      status: query.status,
      solicitanteId: query.solicitanteId,
      vigenteEm: toDate(query.vigenteEm) ?? undefined,
      vencendoAte: toDate(query.vencendoAte) ?? undefined,
      page: query.page,
      pageSize: query.pageSize
    });

    return NextResponse.json({ data: items, meta });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: error.flatten() }, { status: 400 });
    }
    return contratoErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json().catch(() => ({}));
    const input = ContratoCreateSchema.parse(body);

    const contrato = await createContrato(toCreateInput(input), { id: session.userId });
    return NextResponse.json({ data: contrato }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    }
    return contratoErrorResponse(error);
  }
}
