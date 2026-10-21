import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@/lib/prisma";
import { UpdateSharedSecretSchema } from "@/lib/validations/inventory";
import { encryptSecret } from "@/lib/vault";
import { requireStaffSession } from "@/server/services/staff-context";
import { writeAuditLog } from "@/server/services/audit-log";
import { sharedSecretSelect, toSharedSecretDto } from "@/server/services/inventory-credentials";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaffSession();
    const { id } = await params;

    const sharedSecret = await prisma.clientSharedSecret.findFirst({
      where: { id, deleted_at: null },
      select: {
        ...sharedSecretSelect,
        _count: { select: { credentials: { where: { deleted_at: null } } } }
      }
    });

    if (!sharedSecret) {
      return NextResponse.json({ error: "Senha padrão não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: toSharedSecretDto(sharedSecret) });
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
    const input = UpdateSharedSecretSchema.parse(body);

    const existing = await prisma.clientSharedSecret.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, label: true, solicitanteId: true }
    });
    if (!existing) {
      return NextResponse.json({ error: "Senha padrão não encontrada" }, { status: 404 });
    }

    const data: Prisma.ClientSharedSecretUpdateInput = { updated_by: session.userId };
    let rotated = false;
    if (input.label !== undefined) data.label = input.label;
    if (input.notes !== undefined) data.notes = input.notes ?? null;
    // Trocar a senha padrão reflete imediatamente em todas as credenciais vinculadas
    if (input.secret !== undefined) {
      data.secret = encryptSecret(input.secret) as unknown as Prisma.InputJsonValue;
      rotated = true;
    }

    const updated = await prisma.clientSharedSecret.update({
      where: { id },
      data,
      select: sharedSecretSelect
    });

    const credentialCount = await prisma.equipmentCredential.count({
      where: { sharedSecretId: id, deleted_at: null }
    });

    await writeAuditLog({
      actorUserId: session.userId,
      solicitanteId: updated.solicitanteId,
      action: rotated ? "inventory.shared_secret_rotated" : "inventory.shared_secret_updated",
      entity: "client_shared_secret",
      entityId: updated.id,
      metadata: {
        label: updated.label,
        affectedCredentials: credentialCount,
        fields: Object.keys(data).filter((key) => key !== "updated_by")
      }
    });

    return NextResponse.json({ data: toSharedSecretDto(updated, { credentialCount }) });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: z.treeifyError(error) }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Senha padrão não encontrada" }, { status: 404 });
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

    const existing = await prisma.clientSharedSecret.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, label: true, solicitanteId: true }
    });
    if (!existing) {
      return NextResponse.json({ error: "Senha padrão não encontrada" }, { status: 404 });
    }

    // Não permite excluir uma senha padrão ainda em uso pelas credenciais
    const linked = await prisma.equipmentCredential.count({
      where: { sharedSecretId: id, deleted_at: null }
    });
    if (linked > 0) {
      return NextResponse.json(
        { error: `Esta senha padrão está em uso por ${linked} credencial(is). Desvincule antes de excluir.` },
        { status: 409 }
      );
    }

    // Exclusão lógica mantém o histórico de auditoria do cofre
    await prisma.clientSharedSecret.update({
      where: { id },
      data: { deleted_at: new Date(), updated_by: session.userId }
    });

    await writeAuditLog({
      actorUserId: session.userId,
      solicitanteId: existing.solicitanteId,
      action: "inventory.shared_secret_deleted",
      entity: "client_shared_secret",
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
