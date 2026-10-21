import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@/lib/prisma";
import { CreateCredentialSchema } from "@/lib/validations/inventory";
import { encryptSecret } from "@/lib/vault";
import { requireStaffSession } from "@/server/services/staff-context";
import { writeAuditLog } from "@/server/services/audit-log";
import { resolveCredentialAccessBatch } from "@/server/services/inventory-access";
import { credentialSelect, toCredentialDto } from "@/server/services/inventory-credentials";

const CredentialQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  equipmentId: z.string().trim().min(1).optional(),
  search: z.string().optional().default("")
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireStaffSession();

    const parsed = CredentialQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const { page, pageSize, equipmentId, search } = parsed.data;
    const q = search.trim();

    const where: Prisma.EquipmentCredentialWhereInput = { deleted_at: null };
    if (equipmentId) where.equipmentId = equipmentId;
    if (q) {
      where.OR = [
        { label: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } }
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.equipmentCredential.count({ where }),
      prisma.equipmentCredential.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: credentialSelect
      })
    ]);

    const decisions = await resolveCredentialAccessBatch(
      session,
      rows.map((c) => ({ id: c.id, ownerUserId: c.ownerUserId, accessPolicy: c.accessPolicy }))
    );

    const data = rows.map((credential) =>
      toCredentialDto(credential, decisions.get(credential.id) ?? { canView: true, canReveal: false, via: null })
    );

    return NextResponse.json({ data, total, page, pageSize });
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
    const input = CreateCredentialSchema.parse(body);

    if (input.equipmentId) {
      const equipment = await prisma.equipment.findFirst({
        where: { id: input.equipmentId, deleted_at: null },
        select: { id: true, solicitanteId: true }
      });
      if (!equipment) {
        return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
      }
    }

    if (input.ownerUserId) {
      const owner = await prisma.user.findUnique({ where: { id: input.ownerUserId }, select: { id: true } });
      if (!owner) {
        return NextResponse.json({ error: "Responsável não encontrado" }, { status: 404 });
      }
    }

    // Vincula a credencial a uma senha padrão do mesmo cliente do equipamento
    let sharedSecretId: string | null = null;
    if (input.sharedSecretId) {
      if (!input.equipmentId) {
        return NextResponse.json(
          { error: "Vincule a credencial a um equipamento para usar a senha padrão do cliente" },
          { status: 400 }
        );
      }

      const shared = await prisma.clientSharedSecret.findFirst({
        where: { id: input.sharedSecretId, deleted_at: null },
        select: { id: true, solicitanteId: true }
      });
      if (!shared) {
        return NextResponse.json({ error: "Senha padrão não encontrada" }, { status: 404 });
      }

      const equipment = await prisma.equipment.findFirst({
        where: { id: input.equipmentId, deleted_at: null },
        select: { solicitanteId: true }
      });
      if (!equipment?.solicitanteId || equipment.solicitanteId !== shared.solicitanteId) {
        return NextResponse.json({ error: "A senha padrão pertence a outro cliente" }, { status: 409 });
      }

      sharedSecretId = shared.id;
    }

    // A senha é gravada apenas de forma cifrada (AES-256-GCM); com senha padrão, fica nula
    const created = await prisma.equipmentCredential.create({
      data: {
        equipmentId: input.equipmentId ?? null,
        label: input.label,
        protocol: input.protocol ?? "SSH",
        port: input.port ?? null,
        username: input.username ?? null,
        sharedSecretId,
        notes: input.notes ?? null,
        accessPolicy: input.accessPolicy ?? "OWNER_AND_ADMINS",
        // Sem responsável informado, o autor da criação vira o dono da credencial
        ownerUserId: input.ownerUserId ?? session.userId,
        created_by: session.userId,
        updated_by: session.userId,
        // Só grava segredo próprio quando a credencial não reaproveita a senha padrão
        ...(sharedSecretId ? {} : { secret: encryptSecret(input.secret ?? "") as unknown as Prisma.InputJsonValue })
      },
      select: credentialSelect
    });

    await writeAuditLog({
      actorUserId: session.userId,
      action: "inventory.credential_created",
      entity: "equipment_credential",
      entityId: created.id,
      metadata: {
        label: created.label,
        equipmentId: created.equipmentId,
        accessPolicy: created.accessPolicy,
        sharedSecretId
      }
    });

    return NextResponse.json(
      { data: toCredentialDto(created, { canView: true, canReveal: true, via: "owner" }) },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: z.treeifyError(error) }, { status: 400 });
    }
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}
