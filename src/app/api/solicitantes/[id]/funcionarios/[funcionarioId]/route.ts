import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateFuncionarioSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefone: z.string().min(8).optional(),
  whatsappNumber: z.string().optional(),
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

async function findWhatsAppContactByPhone(phone?: string) {
  const normalized = normalizePhone(phone || "");
  if (!normalized) return null;

  return prisma.whatsAppContact.findFirst({
    where: { remoteJid: { contains: normalized } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; funcionarioId: string }> }) {
  try {
    const { id, funcionarioId } = await params;
    const body = await request.json();

    const parsed = UpdateFuncionarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Erro de validação", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const canUseWhatsappRelation = await hasWhatsappContactColumn();

    const existing = await prisma.funcionario.findFirst({
      where: { id: funcionarioId, solicitante_id: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Funcionário não encontrado para este solicitante" }, { status: 404 });
    }

    const phone = parsed.data.telefone ? normalizePhone(parsed.data.telefone) : existing.telefone;
    const whatsappContact = await findWhatsAppContactByPhone(parsed.data.whatsappNumber || phone);

    const updated = await prisma.$transaction(async (tx) => {
      const funcionario = await tx.funcionario.update({
        where: { id: funcionarioId },
        data: {
          ...(parsed.data.nome ? { nome: parsed.data.nome } : {}),
          ...(parsed.data.email ? { email: parsed.data.email } : {}),
          ...(parsed.data.telefone ? { telefone: phone } : {}),
          ...(whatsappContact && canUseWhatsappRelation
            ? {
                whatsappContactId: whatsappContact.id,
                remoteJid: whatsappContact.remoteJid,
                pushName: whatsappContact.pushName,
                profilePicUrl: whatsappContact.profilePicUrl,
                instanceId: whatsappContact.instanceId,
                whatsappId: whatsappContact.id,
              }
            : {}),
        },
      });

      await tx.user.update({
        where: { id: existing.userId },
        data: {
          ...(parsed.data.nome ? { name: parsed.data.nome } : {}),
          ...(parsed.data.email ? { email: parsed.data.email } : {}),
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

      return funcionario;
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("Error updating funcionario:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Já existe cadastro com este e-mail/telefone." }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || "Erro ao atualizar funcionário" }, { status: 500 });
  }
}
