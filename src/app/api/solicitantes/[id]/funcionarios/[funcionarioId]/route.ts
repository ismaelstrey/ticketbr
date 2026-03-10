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

function extractJidPhone(remoteJid?: string | null) {
  if (!remoteJid) return "";
  return normalizePhone(remoteJid.split("@")[0] || "");
}

function isPhoneMatch(inputPhone: string, jidPhone: string) {
  if (!inputPhone || !jidPhone) return false;
  return jidPhone === inputPhone || jidPhone.endsWith(inputPhone) || inputPhone.endsWith(jidPhone);
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
  console.log(`[DEBUG-PUT] Searching WhatsApp contact for phone: "${phone}" -> normalized: "${normalized}"`);

  if (!normalized) return null;

  // Try stricter search first (contains normalized)
  let candidates = await prisma.whatsAppContact.findMany({
    where: { remoteJid: { contains: normalized } },
    take: 5,
  });
  console.log(`[DEBUG-PUT] Exact match candidates: ${candidates.length}`, candidates.map(c => c.remoteJid));

  if (candidates.length === 0 && normalized.length > 8) {
    // Try matching last 8 digits (to handle cases with/without country/area code variations)
    const short = normalized.slice(-8);
    console.log(`[DEBUG-PUT] No exact match. Trying suffix search with: "${short}"`);
    candidates = await prisma.whatsAppContact.findMany({
      where: { remoteJid: { contains: short } },
      take: 10,
    });
    console.log(`[DEBUG-PUT] Suffix match candidates: ${candidates.length}`, candidates.map(c => c.remoteJid));
  }

  const match = candidates.find((contact) => isPhoneMatch(normalized, extractJidPhone(contact.remoteJid)));
  console.log(`[DEBUG-PUT] Final match:`, match?.remoteJid || "None");
  return match || null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; funcionarioId: string }> }) {
  try {
    const { id, funcionarioId } = await params;
    const body = await request.json();

    const parsed = UpdateFuncionarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Erro de validação", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(parsed.data.telefone);
    const normalizedWhatsPhone = normalizePhone(parsed.data.whatsappNumber || parsed.data.telefone);

    // Verificar se existe outro funcionário com mesmo email/telefone
    if (parsed.data.email) {
      const existing = await prisma.funcionario.findFirst({
        where: {
          email: parsed.data.email,
          id: { not: funcionarioId },
        },
      });
      if (existing) {
        return NextResponse.json({ error: "E-mail já está em uso por outro funcionário." }, { status: 409 });
      }
    }

    const whatsappContact = await findWhatsAppContactByPhone(normalizedWhatsPhone);

    const result = await prisma.$transaction(async (tx) => {
      const funcionario = await tx.funcionario.update({
        where: { id: funcionarioId, solicitante_id: id },
        data: {
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
                whatsappContactId: whatsappContact.id,
              }
            : {}),
        },
        include: { user: true, whatsappContact: true },
      });

      // Atualizar user associado se necessário
      if (funcionario.userId) {
        await tx.user.update({
          where: { id: funcionario.userId },
          data: {
            name: parsed.data.nome,
            email: parsed.data.email,
            ...(whatsappContact
              ? {
                  remoteJid: whatsappContact.remoteJid,
                  pushName: whatsappContact.pushName,
                  profilePicUrl: whatsappContact.profilePicUrl,
                  instanceId: whatsappContact.instanceId,
                  whatsappId: whatsappContact.id,
                }
              : {}),
          },
        });
      }

      return funcionario;
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Error updating funcionario:", error);
    return NextResponse.json({ error: error?.message || "Erro ao atualizar funcionário" }, { status: 500 });
  }
}
