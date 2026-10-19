import { NextRequest, NextResponse } from "next/server";
import { Prisma, prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/server/services/staff-context";
import { writeAuditLog } from "@/server/services/audit-log";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; grantId: string }> }
) {
  try {
    const session = await requireStaffSession();
    const { id, grantId } = await params;

    const credential = await prisma.equipmentCredential.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, label: true, ownerUserId: true }
    });
    if (!credential) {
      return NextResponse.json({ error: "Credencial não encontrada" }, { status: 404 });
    }

    // Somente ADMIN ou o responsável pela credencial podem remover concessões
    if (session.role !== "ADMIN" && credential.ownerUserId !== session.userId) {
      return NextResponse.json({ error: "Sem permissão para gerenciar esta ACL" }, { status: 403 });
    }

    const grant = await prisma.credentialAccessGrant.findFirst({
      where: { id: grantId, credentialId: id },
      select: { id: true, subjectType: true, subjectId: true, role: true, level: true }
    });
    if (!grant) {
      return NextResponse.json({ error: "Concessão não encontrada" }, { status: 404 });
    }

    await prisma.credentialAccessGrant.delete({ where: { id: grantId } });

    await writeAuditLog({
      actorUserId: session.userId,
      action: "inventory.credential_grant_deleted",
      entity: "credential_access_grant",
      entityId: grantId,
      metadata: { credentialId: id, label: credential.label, ...grant }
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Concessão não encontrada" }, { status: 404 });
    }
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}
