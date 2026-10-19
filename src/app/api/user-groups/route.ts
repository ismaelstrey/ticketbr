import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@/lib/prisma";
import { CreateUserGroupSchema } from "@/lib/validations/inventory";
import { guardAdmin, requireStaffSession } from "@/server/services/staff-context";
import { writeAuditLog } from "@/server/services/audit-log";

const GroupQuerySchema = z.object({
  search: z.string().optional().default("")
});

export async function GET(request: NextRequest) {
  // Leitura liberada ao staff (usada nos seletores de ACL); mutações são exclusivas de ADMIN
  try {
    await requireStaffSession();

    const parsed = GroupQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const q = parsed.data.search.trim();
    const groups = await prisma.userGroup.findMany({
      where: {
        deleted_at: null,
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {})
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        members: {
          select: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    });

    const data = groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
      members: group.members.map((m) => m.user)
    }));

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}

export async function POST(request: NextRequest) {
  // Criação de grupos é restrita a administradores
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const session = await requireStaffSession();
    const body = await request.json().catch(() => ({}));
    const input = CreateUserGroupSchema.parse(body);

    const memberIds = Array.from(new Set(input.memberIds ?? []));
    if (memberIds.length) {
      const found = await prisma.user.count({ where: { id: { in: memberIds } } });
      if (found !== memberIds.length) {
        return NextResponse.json({ error: "Um ou mais usuários informados não existem" }, { status: 404 });
      }
    }

    const created = await prisma.userGroup.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        created_by: session.userId,
        updated_by: session.userId,
        members: memberIds.length ? { create: memberIds.map((userId) => ({ userId })) } : undefined
      },
      select: { id: true, name: true, description: true, created_at: true, updated_at: true }
    });

    await writeAuditLog({
      actorUserId: session.userId,
      action: "inventory.group_created",
      entity: "user_group",
      entityId: created.id,
      metadata: { name: created.name, members: memberIds.length }
    });

    return NextResponse.json(
      {
        data: {
          id: created.id,
          name: created.name,
          description: created.description,
          createdAt: created.created_at,
          updatedAt: created.updated_at,
          members: []
        }
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: z.treeifyError(error) }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Já existe um grupo com esse nome." }, { status: 409 });
    }
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}
