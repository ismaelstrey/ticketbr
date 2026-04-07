import { prisma } from "@/lib/prisma";

export async function writeAuditLog(input: {
  solicitanteId?: string | null;
  actorUserId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        solicitanteId: input.solicitanteId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: input.metadata as any
      }
    });
  } catch {
    return;
  }
}

