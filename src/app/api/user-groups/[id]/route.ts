import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@/lib/prisma";
import { UpdateUserGroupSchema } from "@/lib/validations/inventory";
import { requireAdminSession, requireStaffSession } from "@/server/services/staff-context";
import { writeAuditLog } from "@/server/services/audit-log";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaffSession();
    const { id } = await params;

    const group = await prisma.userGroup.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        members: { select: { user: { select: { id: true, name: true, email: true } } } }
      }
    });
    if (!group) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: group.id,
        name: group.name,
        description: group.description,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
        members: group.members.map((m) => m.user)
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
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = UpdateUserGroupSchema.parse(body);

    const existing = await prisma.userGroup.findFirst({ where: { id, deleted_at: null }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
    }

    const memberIds = input.memberIds ? Array.from(new Set(input.memberIds)) : null;
    if (memberIds && memberIds.length) {
      const found = await prisma.user.count({ where: { id: { in: memberIds } } });
      if (found !== memberIds.length) {
        return NextResponse.json({ error: "Um ou mais usuários informados não existem" }, { status: 404 });
      }
    }

    const data: Prisma.UserGroupUpdateInput = { updated_by: session.userId };
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description ?? null;

    // Quando memberIds é enviado, a lista de membros é substituída integralmente
    await prisma.$transaction(async (tx) => {
      await tx.userGroup.update({ where: { id }, data });
      if (memberIds) {
        await tx.userGroupMember.deleteMany({ where: { groupId: id } });
        if (memberIds.length) {
          await tx.userGroupMember.createMany({ data: memberIds.map((userId) => ({ groupId: id, userId })) });
        }
      }
    });

    await writeAuditLog({
      actorUserId: session.userId,
      action: "inventory.group_updated",
      entity: "user_group",
      entityId: id,
      metadata: { fields: Object.keys(data).filter((key) => key !== "updated_by"), members: memberIds?.length ?? null }
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: z.treeifyError(error) }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
      if (error.code === "P2002") return NextResponse.json({ error: "Já existe um grupo com esse nome." }, { status: 409 });
    }
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;

    const existing = await prisma.userGroup.findFirst({ where: { id, deleted_at: null }, select: { id: true, name: true } });
    if (!existing) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
    }

    // Exclusão lógica; as concessões de ACL apontando para o grupo permanecem para auditoria
    await prisma.userGroup.update({
      where: { id },
      data: { deleted_at: new Date(), updated_by: session.userId }
    });

    await writeAuditLog({
      actorUserId: session.userId,
      action: "inventory.group_deleted",
      entity: "user_group",
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
