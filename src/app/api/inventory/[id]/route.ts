import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@/lib/prisma";
import { UpdateEquipmentSchema } from "@/lib/validations/inventory";
import { requireStaffSession } from "@/server/services/staff-context";
import { writeAuditLog } from "@/server/services/audit-log";
import { resolveCredentialAccessBatch } from "@/server/services/inventory-access";
import { credentialSelect, toCredentialDto } from "@/server/services/inventory-credentials";
import { validateParentAssignment } from "@/server/services/inventory-tree";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;

    const equipment = await prisma.equipment.findFirst({
      where: { id, deleted_at: null },
      include: {
        solicitante: { select: { id: true, nome_fantasia: true } },
        credentials: {
          where: { deleted_at: null },
          orderBy: { created_at: "asc" },
          select: credentialSelect
        }
      }
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
    }

    // Resolve, em lote, quem pode revelar cada senha (ACL do cofre)
    const decisions = await resolveCredentialAccessBatch(
      session,
      equipment.credentials.map((c) => ({ id: c.id, ownerUserId: c.ownerUserId, accessPolicy: c.accessPolicy }))
    );

    const credentials = equipment.credentials.map((credential) =>
      toCredentialDto(credential, decisions.get(credential.id) ?? { canView: true, canReveal: false, via: null }, {
        equipmentName: equipment.name
      })
    );

    return NextResponse.json({
      data: {
        id: equipment.id,
        code: equipment.code,
        name: equipment.name,
        type: equipment.type,
        status: equipment.status,
        brand: equipment.brand,
        model: equipment.model,
        serialNumber: equipment.serialNumber,
        hostname: equipment.hostname,
        ipAddress: equipment.ipAddress,
        macAddress: equipment.macAddress,
        location: equipment.location,
        func: equipment.func,
        description: equipment.description,
        // Hierarquia e dados de infraestrutura virtualizada
        parentId: equipment.parentId,
        virtualizationPlatform: equipment.virtualizationPlatform,
        managementController: equipment.managementController,
        managementIp: equipment.managementIp,
        managementUrl: equipment.managementUrl,
        url: equipment.url,
        vmid: equipment.vmid,
        guestOs: equipment.guestOs,
        cpuCores: equipment.cpuCores,
        memoryMb: equipment.memoryMb,
        diskGb: equipment.diskGb,
        tags: equipment.tags,
        solicitanteId: equipment.solicitanteId,
        solicitante: equipment.solicitante,
        createdAt: equipment.created_at,
        updatedAt: equipment.updated_at,
        credentials
      }
    });
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
    const input = UpdateEquipmentSchema.parse(body);

    const existing = await prisma.equipment.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, solicitanteId: true }
    });
    if (!existing) {
      return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
    }

    if (input.solicitanteId) {
      const solicitante = await prisma.solicitante.findFirst({
        where: { id: input.solicitanteId, status: true },
        select: { id: true }
      });
      if (!solicitante) {
        return NextResponse.json({ error: "Solicitante não encontrado" }, { status: 404 });
      }
    }

    const data: Prisma.EquipmentUpdateInput = { updated_by: session.userId };
    if (input.code !== undefined) data.code = input.code ?? null;
    if (input.name !== undefined) data.name = input.name;
    if (input.type !== undefined) data.type = input.type;
    if (input.status !== undefined) data.status = input.status;
    if (input.brand !== undefined) data.brand = input.brand ?? null;
    if (input.model !== undefined) data.model = input.model ?? null;
    if (input.serialNumber !== undefined) data.serialNumber = input.serialNumber ?? null;
    if (input.hostname !== undefined) data.hostname = input.hostname ?? null;
    if (input.ipAddress !== undefined) data.ipAddress = input.ipAddress ?? null;
    if (input.macAddress !== undefined) data.macAddress = input.macAddress ?? null;
    if (input.location !== undefined) data.location = input.location ?? null;
    if (input.func !== undefined) data.func = input.func ?? null;
    if (input.description !== undefined) data.description = input.description ?? null;
    // Hierarquia e dados de infraestrutura virtualizada
    if (input.virtualizationPlatform !== undefined) data.virtualizationPlatform = input.virtualizationPlatform ?? null;
    if (input.managementController !== undefined) data.managementController = input.managementController ?? null;
    if (input.managementIp !== undefined) data.managementIp = input.managementIp ?? null;
    if (input.managementUrl !== undefined) data.managementUrl = input.managementUrl ?? null;
    if (input.url !== undefined) data.url = input.url ?? null;
    if (input.vmid !== undefined) data.vmid = input.vmid ?? null;
    if (input.guestOs !== undefined) data.guestOs = input.guestOs ?? null;
    if (input.cpuCores !== undefined) data.cpuCores = input.cpuCores ?? null;
    if (input.memoryMb !== undefined) data.memoryMb = input.memoryMb ?? null;
    if (input.diskGb !== undefined) data.diskGb = input.diskGb ?? null;
    if (input.tags !== undefined) data.tags = input.tags ?? [];
    if (input.solicitanteId !== undefined) {
      data.solicitante = input.solicitanteId ? { connect: { id: input.solicitanteId } } : { disconnect: true };
    }

    // Vínculo de hierarquia (host -> VM -> container) com validação de cliente e ciclos
    if (input.parentId !== undefined) {
      if (input.parentId === null) {
        data.parent = { disconnect: true };
      } else {
        const effectiveSolicitanteId =
          input.solicitanteId !== undefined ? input.solicitanteId ?? null : existing.solicitanteId;
        const parentResult = await validateParentAssignment({
          parentId: input.parentId,
          childSolicitanteId: effectiveSolicitanteId,
          childId: id
        });
        if (!parentResult.ok) {
          return NextResponse.json({ error: parentResult.error }, { status: parentResult.status });
        }
        data.parent = { connect: { id: parentResult.parent.id } };
        // O recurso vincula-se ao mesmo cliente do host
        data.solicitante = parentResult.parent.solicitanteId
          ? { connect: { id: parentResult.parent.solicitanteId } }
          : { disconnect: true };
      }
    }

    const updated = await prisma.equipment.update({
      where: { id },
      data,
      include: { solicitante: { select: { id: true, nome_fantasia: true } } }
    });

    await writeAuditLog({
      actorUserId: session.userId,
      solicitanteId: updated.solicitanteId,
      action: "inventory.equipment_updated",
      entity: "equipment",
      entityId: updated.id,
      metadata: { fields: Object.keys(data).filter((key) => key !== "updated_by") }
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: z.treeifyError(error) }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
      if (error.code === "P2002") return NextResponse.json({ error: "Código/patrimônio já utilizado." }, { status: 409 });
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

    const existing = await prisma.equipment.findFirst({ where: { id, deleted_at: null }, select: { id: true, name: true } });
    if (!existing) {
      return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
    }

    // Exclusão lógica (mantém histórico e credenciais para auditoria)
    await prisma.equipment.update({
      where: { id },
      data: { deleted_at: new Date(), updated_by: session.userId }
    });

    await writeAuditLog({
      actorUserId: session.userId,
      action: "inventory.equipment_deleted",
      entity: "equipment",
      entityId: id,
      metadata: { name: existing.name }
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}
