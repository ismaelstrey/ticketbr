import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@/lib/prisma";
import { CreateEquipmentSchema, EquipmentQuerySchema } from "@/lib/validations/inventory";
import { requireStaffSession } from "@/server/services/staff-context";
import { writeAuditLog } from "@/server/services/audit-log";
import { validateParentAssignment } from "@/server/services/inventory-tree";

// Monta o filtro de listagem do inventário a partir dos parâmetros de consulta
function buildWhere(query: z.infer<typeof EquipmentQuerySchema>): Prisma.EquipmentWhereInput {
  const where: Prisma.EquipmentWhereInput = { deleted_at: null };
  const search = query.search.trim();

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { ipAddress: { contains: search } },
      { hostname: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { serialNumber: { contains: search, mode: "insensitive" } }
    ];
  }

  if (query.type) where.type = query.type;
  if (query.status) where.status = query.status;
  if (query.solicitanteId) where.solicitanteId = query.solicitanteId;

  return where;
}

export async function GET(request: NextRequest) {
  try {
    await requireStaffSession();

    const parsed = EquipmentQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const { page, pageSize } = parsed.data;
    const where = buildWhere(parsed.data);

    const [total, rows] = await Promise.all([
      prisma.equipment.count({ where }),
      prisma.equipment.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          solicitante: { select: { id: true, nome_fantasia: true } },
          _count: { select: { credentials: { where: { deleted_at: null } } } }
        }
      })
    ]);

    const data = rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      status: row.status,
      brand: row.brand,
      model: row.model,
      serialNumber: row.serialNumber,
      hostname: row.hostname,
      ipAddress: row.ipAddress,
      macAddress: row.macAddress,
      location: row.location,
      func: row.func,
      description: row.description,
      // Hierarquia e dados de infraestrutura virtualizada
      parentId: row.parentId,
      virtualizationPlatform: row.virtualizationPlatform,
      managementController: row.managementController,
      managementIp: row.managementIp,
      managementUrl: row.managementUrl,
      url: row.url,
      vmid: row.vmid,
      guestOs: row.guestOs,
      cpuCores: row.cpuCores,
      memoryMb: row.memoryMb,
      diskGb: row.diskGb,
      tags: row.tags,
      solicitanteId: row.solicitanteId,
      solicitante: row.solicitante,
      credentialCount: row._count.credentials,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

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
    const input = CreateEquipmentSchema.parse(body);

    // O cliente do recurso pode ser herdado do host informado
    let solicitanteId: string | null = input.solicitanteId ?? null;
    let parentId: string | null = null;

    if (input.parentId) {
      const parentResult = await validateParentAssignment({ parentId: input.parentId, childSolicitanteId: solicitanteId });
      if (!parentResult.ok) {
        return NextResponse.json({ error: parentResult.error }, { status: parentResult.status });
      }
      parentId = parentResult.parent.id;
      solicitanteId = parentResult.parent.solicitanteId;
    }

    if (solicitanteId) {
      const solicitante = await prisma.solicitante.findFirst({
        where: { id: solicitanteId, status: true },
        select: { id: true }
      });
      if (!solicitante) {
        return NextResponse.json({ error: "Solicitante não encontrado" }, { status: 404 });
      }
    }

    const created = await prisma.equipment.create({
      data: {
        code: input.code ?? null,
        name: input.name,
        type: input.type,
        status: input.status ?? "ACTIVE",
        brand: input.brand ?? null,
        model: input.model ?? null,
        serialNumber: input.serialNumber ?? null,
        hostname: input.hostname ?? null,
        ipAddress: input.ipAddress ?? null,
        macAddress: input.macAddress ?? null,
        location: input.location ?? null,
        func: input.func ?? null,
        description: input.description ?? null,
        // Hierarquia e dados de infraestrutura virtualizada
        parentId,
        virtualizationPlatform: input.virtualizationPlatform ?? null,
        managementController: input.managementController ?? null,
        managementIp: input.managementIp ?? null,
        managementUrl: input.managementUrl ?? null,
        url: input.url ?? null,
        vmid: input.vmid ?? null,
        guestOs: input.guestOs ?? null,
        cpuCores: input.cpuCores ?? null,
        memoryMb: input.memoryMb ?? null,
        diskGb: input.diskGb ?? null,
        tags: input.tags ?? [],
        solicitanteId,
        created_by: session.userId,
        updated_by: session.userId
      },
      include: { solicitante: { select: { id: true, nome_fantasia: true } } }
    });

    await writeAuditLog({
      actorUserId: session.userId,
      solicitanteId: created.solicitanteId,
      action: "inventory.equipment_created",
      entity: "equipment",
      entityId: created.id,
      metadata: { name: created.name, type: created.type }
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: z.treeifyError(error) }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Já existe um equipamento com este código/patrimônio." }, { status: 409 });
    }
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}
