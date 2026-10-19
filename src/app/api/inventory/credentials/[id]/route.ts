import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@/lib/prisma";
import { UpdateCredentialSchema } from "@/lib/validations/inventory";
import { encryptSecret } from "@/lib/vault";
import { requireStaffSession } from "@/server/services/staff-context";
import { writeAuditLog } from "@/server/services/audit-log";
import { resolveCredentialAccessBatch } from "@/server/services/inventory-access";
import { credentialSelect, toCredentialDto } from "@/server/services/inventory-credentials";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;

    const credential = await prisma.equipmentCredential.findFirst({
      where: { id, deleted_at: null },
      select: credentialSelect
    });

    if (!credential) {
      return NextResponse.json({ error: "Credencial não encontrada" }, { status: 404 });
    }

    // Resolve a permissão de revelação para esta credencial
    const decisions = await resolveCredentialAccessBatch(session, [
      { id: credential.id, ownerUserId: credential.ownerUserId, accessPolicy: credential.accessPolicy }
    ]);

    const data = toCredentialDto(
      credential,
      decisions.get(credential.id) ?? { canView: true, canReveal: false, via: null }
    );

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = UpdateCredentialSchema.parse(body);

    const existing = await prisma.equipmentCredential.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, label: true }
    });
    if (!existing) {
      return NextResponse.json({ error: "Credencial não encontrada" }, { status: 404 });
    }

    if (input.ownerUserId) {
      const owner = await prisma.user.findUnique({ where: { id: input.ownerUserId }, select: { id: true } });
      if (!owner) {
        return NextResponse.json({ error: "Responsável não encontrado" }, { status: 404 });
      }
    }

    const data: Prisma.EquipmentCredentialUpdateInput = { updated_by: session.userId };
    let rotated = false;
    if (input.label !== undefined) data.label = input.label;
    if (input.protocol !== undefined) data.protocol = input.protocol;
    if (input.port !== undefined) data.port = input.port ?? null;
    if (input.username !== undefined) data.username = input.username ?? null;
    if (input.notes !== undefined) data.notes = input.notes ?? null;
    if (input.accessPolicy !== undefined) data.accessPolicy = input.accessPolicy;
    if (input.ownerUserId !== undefined) {
      data.owner = input.ownerUserId ? { connect: { id: input.ownerUserId } } : { disconnect: true };
    }
    // Quando uma nova senha é informada, ela é recifrada e a rotação é registrada
    if (input.secret !== undefined) {
      data.secret = encryptSecret(input.secret) as unknown as Prisma.InputJsonValue;
      data.lastRotatedAt = new Date();
      rotated = true;
    }

    const updated = await prisma.equipmentCredential.update({
      where: { id },
      data,
      select: credentialSelect
    });

    await writeAuditLog({
      actorUserId: session.userId,
      action: rotated ? "inventory.credential_rotated" : "inventory.credential_updated",
      entity: "equipment_credential",
      entityId: updated.id,
      metadata: { label: updated.label, fields: Object.keys(data).filter((key) => key !== "updated_by") }
    });

    const decisions = await resolveCredentialAccessBatch(session, [
      { id: updated.id, ownerUserId: updated.ownerUserId, accessPolicy: updated.accessPolicy }
    ]);

    return NextResponse.json({
      data: toCredentialDto(updated, decisions.get(updated.id) ?? { canView: true, canReveal: false, via: null })
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: z.treeifyError(error) }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Credencial não encontrada" }, { status: 404 });
    }
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;

    const existing = await prisma.equipmentCredential.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, label: true }
    });
    if (!existing) {
      return NextResponse.json({ error: "Credencial não encontrada" }, { status: 404 });
    }

    // Exclusão lógica mantém o histórico de auditoria do cofre
    await prisma.equipmentCredential.update({
      where: { id },
      data: { deleted_at: new Date(), updated_by: session.userId }
    });

    await writeAuditLog({
      actorUserId: session.userId,
      action: "inventory.credential_deleted",
      entity: "equipment_credential",
      entityId: id,
      metadata: { label: existing.label }
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}
