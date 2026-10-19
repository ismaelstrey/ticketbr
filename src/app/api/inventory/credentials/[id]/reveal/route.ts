import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret, isEncryptedPayload } from "@/lib/vault";
import { requireStaffSession } from "@/server/services/staff-context";
import { writeAuditLog } from "@/server/services/audit-log";
import { resolveCredentialAccessBatch } from "@/server/services/inventory-access";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;

    const credential = await prisma.equipmentCredential.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, label: true, ownerUserId: true, accessPolicy: true, secret: true, equipmentId: true }
    });

    if (!credential) {
      return NextResponse.json({ error: "Credencial não encontrada" }, { status: 404 });
    }

    // Apenas quem tem permissão de revelação recebe a senha em texto puro
    const decisions = await resolveCredentialAccessBatch(session, [
      { id: credential.id, ownerUserId: credential.ownerUserId, accessPolicy: credential.accessPolicy }
    ]);
    const decision = decisions.get(credential.id);

    if (!decision?.canReveal) {
      await writeAuditLog({
        actorUserId: session.userId,
        action: "inventory.credential_reveal_denied",
        entity: "equipment_credential",
        entityId: credential.id,
        metadata: { label: credential.label, accessPolicy: credential.accessPolicy }
      });
      return NextResponse.json({ error: "Sem permissão para visualizar esta senha" }, { status: 403 });
    }

    if (!isEncryptedPayload(credential.secret)) {
      return NextResponse.json({ error: "Segredo indisponível" }, { status: 500 });
    }

    let secret = "";
    try {
      secret = decryptSecret(credential.secret);
    } catch {
      return NextResponse.json({ error: "Falha ao decifrar o segredo" }, { status: 500 });
    }

    // Toda revelação é registrada na auditoria (quem, quando e por qual via)
    await writeAuditLog({
      actorUserId: session.userId,
      action: "inventory.credential_revealed",
      entity: "equipment_credential",
      entityId: credential.id,
      metadata: { label: credential.label, via: decision.via, equipmentId: credential.equipmentId }
    });

    return NextResponse.json({ data: { id: credential.id, secret } });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}
