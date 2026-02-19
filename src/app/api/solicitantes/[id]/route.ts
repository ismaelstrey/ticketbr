import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { UpdateSolicitanteSchema } from "@/lib/validations/solicitante";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const solicitante = await prisma.solicitante.findFirst({
      where: { id, status: true },
    });
    if (!solicitante) {
      return NextResponse.json({ error: "Solicitante não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ data: solicitante });
  } catch (error) {
    console.error("Error fetching solicitante:", error);
    return NextResponse.json({ error: "Failed to fetch solicitante" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = UpdateSolicitanteSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Erro de validação", details: z.treeifyError(result.error) }, { status: 400 });
    }

    const updated = await prisma.solicitante.update({
      where: { id },
      data: {
        ...(result.data.nome
          ? { razao_social: result.data.nome, nome_fantasia: result.data.nome }
          : {}),
        ...(result.data.cpfCnpj ? { cnpj: result.data.cpfCnpj } : {}),
        ...(result.data.email ? { email: result.data.email } : {}),
        ...(result.data.telefone ? { telefone: result.data.telefone } : {}),
        ...(result.data.enderecoCompleto ? { endereco_completo: result.data.enderecoCompleto } : {}),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "CPF/CNPJ já cadastrado." }, { status: 409 });
    }
    const message = typeof error?.message === "string" ? error.message : "Failed to update solicitante";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.solicitante.update({
      where: { id },
      data: { status: false, deleted_at: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting solicitante:", error);
    return NextResponse.json({ error: "Failed to delete solicitante" }, { status: 500 });
  }
}
