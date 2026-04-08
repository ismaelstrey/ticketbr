import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireStaffSession } from "@/server/services/staff-context";

const TaskPrioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
const TaskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "DONE"]);

const UpdateTaskSchema = z.object({
  title: z.string().min(2).max(180).optional(),
  description: z.string().max(50_000).optional().nullable(),
  priority: TaskPrioritySchema.optional(),
  status: TaskStatusSchema.optional(),
  dueAt: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable()
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaffSession();
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        subtasks: { orderBy: { sortOrder: "asc" } },
        attachments: { orderBy: { createdAt: "desc" }, select: { id: true, fileName: true, mimeType: true, fileSize: true, createdAt: true, createdById: true } },
        ticketLinks: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: task });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = UpdateTaskSchema.parse(body);

    const current = await prisma.task.findUnique({ where: { id }, select: { id: true, createdById: true, status: true } });
    if (!current) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    if (session.role !== "ADMIN" && current.createdById !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const nextStatus = input.status ?? current.status;
    const completedAt = nextStatus === "DONE" ? new Date() : null;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
        ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(input.dueAt) : null } : {}),
        ...(input.status !== undefined ? { status: input.status, completedAt } : {})
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        ticketLinks: { select: { id: true, ticketId: true } },
        subtasks: { select: { id: true, isDone: true } }
      }
    });

    return NextResponse.json({ data: task });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.flatten() }, { status: 400 });
    }
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;

    const current = await prisma.task.findUnique({ where: { id }, select: { id: true, createdById: true } });
    if (!current) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    if (session.role !== "ADMIN" && current.createdById !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

