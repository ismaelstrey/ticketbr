import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@/lib/prisma";
import { CreateGrantSchema } from "@/lib/validations/inventory";
import { requireStaffSession } from "@/server/services/staff-context";
import { writeAuditLog } from "@/server/services/audit-log";
import { describeGrants } from "@/server/services/inventory-access";

// Somente ADMIN ou o responsável pela credencial podem administrar a ACL
async function loadManageableCredential(credentialId: string, session: { userId: string; role: string }) {
  const credential = await prisma.equipmentCredential.findFirst({
    where: { id: credentialId, deleted_at: null },
    select: { id: true, label: true, ownerUserId: true }
  });
  if (!credential) return { error: "not_found" as const };

  const canManage = session.role === "ADMIN" || credential.ownerUserId === session.userId;
  if (!canManage) return { error: "forbidden" as const };

  return { credential };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaffSession();
    const { id } = await params;

    const credential = await prisma.equipmentCredential.findFirst({
      where: { id, deleted_at: null },
      select: { id: true }
    });
    if (!credential) {
      return NextResponse.json({ error: "Credencial não encontrada" }, { status: 404 });
    }

    const grants = await prisma.credentialAccessGrant.findMany({
      where: { credentialId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, subjectType: true, subjectId: true, role: true, level: true }
    });

    return NextResponse.json({ data: await describeGrants(grants) });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = CreateGrantSchema.parse(body);

    const managed = await loadManageableCredential(id, session);
    if ("error" in managed) {
      const status = managed.error === "not_found" ? 404 : 403;
      return NextResponse.json(
        { error: managed.error === "not_found" ? "Credencial não encontrada" : "Sem permissão para gerenciar esta ACL" },
        { status }
      );
    }

    // Valida a existência do sujeito da concessão
    if (input.subjectType === "USER" && input.subjectId) {
      const user = await prisma.user.findUnique({ where: { id: input.subjectId }, select: { id: true } });
      if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    if (input.subjectType === "GROUP" && input.subjectId) {
      const group = await prisma.userGroup.findFirst({
        where: { id: input.subjectId, deleted_at: null },
        select: { id: true }
      });
      if (!group) return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
    }

    const created = await prisma.credentialAccessGrant.create({
      data: {
        credentialId: id,
        subjectType: input.subjectType,
        subjectId: input.subjectType === "ROLE" ? null : input.subjectId ?? null,
        role: input.subjectType === "ROLE" ? input.role ?? null : null,
        level: input.level ?? "REVEAL",
        createdById: session.userId
      },
      select: { id: true, subjectType: true, subjectId: true, role: true, level: true }
    });

    await writeAuditLog({
      actorUserId: session.userId,
      action: "inventory.credential_grant_created",
      entity: "credential_access_grant",
      entityId: created.id,
      metadata: { credentialId: id, label: managed.credential.label, ...created }
    });

    return NextResponse.json({ data: (await describeGrants([created]))[0] }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: z.treeifyError(error) }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "Referência inválida" }, { status: 400 });
    }
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}
