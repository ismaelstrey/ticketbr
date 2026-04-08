import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireStaffSession } from "@/server/services/staff-context";

const MoveSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]),
  beforeId: z.string().optional().nullable()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaffSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = MoveSchema.parse(body);

    const task = await prisma.task.findUnique({ where: { id }, select: { id: true, status: true, sortOrder: true } });
    if (!task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    const destStatus = input.status;
    const beforeId = input.beforeId ? String(input.beforeId) : null;

    let nextOrder = 0;

    if (beforeId) {
      const before = await prisma.task.findUnique({ where: { id: beforeId }, select: { id: true, status: true, sortOrder: true } });
      if (before && before.status === destStatus) {
        const prev = await prisma.task.findFirst({
          where: { status: destStatus, sortOrder: { lt: before.sortOrder } },
          orderBy: { sortOrder: "desc" },
          select: { sortOrder: true }
        });
        const prevOrder = prev?.sortOrder ?? before.sortOrder - 1000;
        nextOrder = (prevOrder + before.sortOrder) / 2;
      }
    }

    if (!nextOrder) {
      const last = await prisma.task.findFirst({
        where: { status: destStatus },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true }
      });
      nextOrder = (last?.sortOrder ?? 0) + 1000;
    }

    const completedAt = destStatus === "DONE" ? new Date() : null;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status: destStatus,
        sortOrder: nextOrder,
        completedAt
      },
      include: { assignee: { select: { id: true, name: true } }, ticketLinks: { select: { id: true, ticketId: true } }, subtasks: { select: { id: true, isDone: true } } }
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.flatten() }, { status: 400 });
    }
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

