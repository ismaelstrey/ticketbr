import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@/lib/prisma";
import { CreateSharedSecretSchema } from "@/lib/validations/inventory";
import { encryptSecret } from "@/lib/vault";
import { requireStaffSession } from "@/server/services/staff-context";
import { writeAuditLog } from "@/server/services/audit-log";
import { sharedSecretSelect, toSharedSecretDto } from "@/server/services/inventory-credentials";

const SharedSecretQuerySchema = z.object({
  solicitanteId: z.string().trim().min(1).optional()
});

export async function GET(request: NextRequest) {
  try {
    await requireStaffSession();

    const parsed = SharedSecretQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const where: Prisma.ClientSharedSecretWhereInput = { deleted_at: null };
    if (parsed.data.solicitanteId) where.solicitanteId = parsed.data.solicitanteId;

    const rows = await prisma.clientSharedSecret.findMany({
      where,
      orderBy: { created_at: "asc" },
      select: {
        ...sharedSecretSelect,
        _count: { select: { credentials: { where: { deleted_at: null } } } }
      }
    });

    return NextResponse.json({ data: rows.map((row) => toSharedSecretDto(row)) });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireStaffSession();
    const body = await request.json().catch(() => ({}));
    const input = CreateSharedSecretSchema.parse(body);

    const solicitante = await prisma.solicitante.findFirst({
      where: { id: input.solicitanteId, status: true },
      select: { id: true }
    });
    if (!solicitante) {
      return NextResponse.json({ error: "Solicitante não encontrado" }, { status: 404 });
    }

    // A senha padrão é gravada apenas de forma cifrada (AES-256-GCM)
    const created = await prisma.clientSharedSecret.create({
      data: {
        solicitanteId: input.solicitanteId,
        label: input.label,
        secret: encryptSecret(input.secret) as unknown as Prisma.InputJsonValue,
        notes: input.notes ?? null,
        created_by: session.userId,
        updated_by: session.userId
      },
      select: sharedSecretSelect
    });

    await writeAuditLog({
      actorUserId: session.userId,
      solicitanteId: created.solicitanteId,
      action: "inventory.shared_secret_created",
      entity: "client_shared_secret",
      entityId: created.id,
      metadata: { label: created.label }
    });

    return NextResponse.json({ data: toSharedSecretDto(created, { credentialCount: 0 }) }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: z.treeifyError(error) }, { status: 400 });
    }
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}
