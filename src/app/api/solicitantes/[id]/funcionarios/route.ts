import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const CreateFuncionarioSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(8, "Telefone é obrigatório"),
  whatsappNumber: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
});

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

async function hasWhatsappContactColumn() {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('Funcionario', 'funcionario')
          AND column_name = 'whatsapp_contact_id'
      ) AS exists
    `
  );

  return Boolean(rows?.[0]?.exists);
}

async function findWhatsAppContactByPhone(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  return prisma.whatsAppContact.findFirst({
    where: { remoteJid: { contains: normalized } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const canUseWhatsappRelation = await hasWhatsappContactColumn();

    const solicitante = await prisma.solicitante.findFirst({ where: { id, status: true } });
    if (!solicitante) {
      return NextResponse.json({ error: "Solicitante não encontrado" }, { status: 404 });
    }

    const funcionarios = await prisma.funcionario.findMany({
      where: { solicitante_id: id },
      include: canUseWhatsappRelation
        ? {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
              },
            },
            whatsappContact: {
              select: {
                id: true,
                remoteJid: true,
                pushName: true,
                profilePicUrl: true,
                instanceId: true,
                updatedAt: true,
              },
            },
          }
        : {
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
    const canUseWhatsappRelation = await hasWhatsappContactColumn();
    const body = await request.json();

    const parsed = CreateFuncionarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Erro de validação", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const solicitante = await prisma.solicitante.findFirst({ where: { id, status: true } });
    if (!solicitante) {
      return NextResponse.json({ error: "Solicitante não encontrado" }, { status: 404 });
    }

    const normalizedPhone = normalizePhone(parsed.data.telefone);
    const normalizedWhatsPhone = normalizePhone(parsed.data.whatsappNumber || parsed.data.telefone);
    const passwordHash = await bcrypt.hash(parsed.data.password || "mudar123", 10);

    const whatsappContact = await findWhatsAppContactByPhone(normalizedWhatsPhone);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.data.nome,
          email: parsed.data.email,
          password: passwordHash,
          role: "CUSTOMER",
          ...(whatsappContact
            ? {
                remoteJid: whatsappContact.remoteJid,
                pushName: whatsappContact.pushName,
                profilePicUrl: whatsappContact.profilePicUrl,
                instanceId: whatsappContact.instanceId,
              }
            : {}),
        },
      });

      const funcionario = await tx.funcionario.create({
        data: {
          solicitante_id: id,
          userId: user.id,
          nome: parsed.data.nome,
          email: parsed.data.email,
          telefone: normalizedPhone,
          ...(whatsappContact
            ? {
                remoteJid: whatsappContact.remoteJid,
                pushName: whatsappContact.pushName,
                profilePicUrl: whatsappContact.profilePicUrl,
                instanceId: whatsappContact.instanceId,
                whatsappId: whatsappContact.id,
                ...(canUseWhatsappRelation ? { whatsappContactId: whatsappContact.id } : {}),
              }
            : {}),
        },
        include: canUseWhatsappRelation ? { whatsappContact: true } : undefined,
      });

      return { user, funcionario };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating funcionario for solicitante:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe cadastro com este e-mail, telefone ou WhatsApp." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error?.message || "Erro ao cadastrar funcionário" }, { status: 500 });
  }
}
