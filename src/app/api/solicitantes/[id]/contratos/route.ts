import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  listContratosDisponiveis,
  listContratosDoSolicitante,
  vincularContrato
} from "@/server/services/contract-service";
import { requireAdminSession, requireStaffSession } from "@/server/services/staff-context";
import { contratoErrorResponse } from "../../../contratos/helpers";

type Params = { params: Promise<{ id: string }> };

const VincularSchema = z.object({
  contratoId: z.string().trim().min(1)
});

async function assertSolicitanteExiste(id: string) {
  const solicitante = await prisma.solicitante.findFirst({
    where: { id, deleted_at: null },
    select: { id: true }
  });
  if (!solicitante) {
    return NextResponse.json({ error: "Solicitante não encontrado" }, { status: 404 });
  }
  return null;
}

/** Contratos da empresa (vigente + histórico) e contratos elegíveis para vínculo. */
export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireStaffSession();
    const { id } = await params;

    const notFound = await assertSolicitanteExiste(id);
    if (notFound) return notFound;

    const [{ contratos, vigente }, disponiveis] = await Promise.all([
      listContratosDoSolicitante(id),
      listContratosDisponiveis()
    ]);

    return NextResponse.json({ data: { contratos, vigente, disponiveis } });
  } catch (error) {
    return contratoErrorResponse(error);
  }
}

/** Vincula um contrato existente a esta empresa. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;

    const notFound = await assertSolicitanteExiste(id);
    if (notFound) return notFound;

    const body = await request.json().catch(() => ({}));
    const { contratoId } = VincularSchema.parse(body);

    const contrato = await vincularContrato(contratoId, id, { id: session.userId });
    return NextResponse.json({ data: contrato });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    }
    return contratoErrorResponse(error);
  }
}

/** Desvincula o contrato da empresa (`?contratoId=`). */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;

    const notFound = await assertSolicitanteExiste(id);
    if (notFound) return notFound;

    const contratoId = String(request.nextUrl.searchParams.get("contratoId") ?? "").trim();
    if (!contratoId) {
      return NextResponse.json({ error: "Informe o contrato a desvincular." }, { status: 400 });
    }

    const contrato = await vincularContrato(contratoId, null, { id: session.userId });
    return NextResponse.json({ data: contrato });
  } catch (error) {
    return contratoErrorResponse(error);
  }
}
