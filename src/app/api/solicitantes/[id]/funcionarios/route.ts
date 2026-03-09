import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const CreateFuncionarioSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(8, "Telefone é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const solicitante = await prisma.solicitante.findFirst({ where: { id, status: true } });
    if (!solicitante) {
      return NextResponse.json({ error: "Solicitante não encontrado" }, { status: 404 });
    }

    const funcionarios = await prisma.funcionario.findMany({
      where: { solicitante_id: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: funcionarios });
  } catch (error) {
    console.error("Error listing funcionarios by solicitante:", error);
    return NextResponse.json({ error: "Erro ao listar funcionários" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = CreateFuncionarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Erro de validação", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const solicitante = await prisma.solicitante.findFirst({ where: { id, status: true } });
    if (!solicitante) {
      return NextResponse.json({ error: "Solicitante não encontrado" }, { status: 404 });
    }

    const normalizedPhone = parsed.data.telefone.replace(/\D/g, "");
    const passwordHash = await bcrypt.hash(parsed.data.password || "mudar123", 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.data.nome,
          email: parsed.data.email,
          password: passwordHash,
          role: "CUSTOMER",
        },
      });

      const funcionario = await tx.funcionario.create({
        data: {
          solicitante_id: id,
          userId: user.id,
          nome: parsed.data.nome,
          email: parsed.data.email,
          telefone: normalizedPhone,
        },
      });

      return { user, funcionario };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating funcionario for solicitante:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe cadastro com este e-mail ou telefone para este solicitante." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error?.message || "Erro ao cadastrar funcionário" }, { status: 500 });
  }
}
