import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireStaffSession } from "@/server/services/staff-context";

const UpdateSubtaskSchema = z.object({
  title: z.string().min(1).max(220).optional(),
  isDone: z.boolean().optional(),
  sortOrder: z.number().optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  try {
    await requireStaffSession();
    const { id, subtaskId } = await params;
    const body = await request.json().catch(() => ({}));
    const input = UpdateSubtaskSchema.parse(body);

    const current = await prisma.taskSubtask.findUnique({ where: { id: subtaskId }, select: { id: true, taskId: true } });
    if (!current || current.taskId !== id) {
      return NextResponse.json({ error: "Subtarefa não encontrada" }, { status: 404 });
    }

    const updated = await prisma.taskSubtask.update({
      where: { id: subtaskId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.isDone !== undefined ? { isDone: input.isDone } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {})
      }
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  try {
    await requireStaffSession();
    const { id, subtaskId } = await params;
    const current = await prisma.taskSubtask.findUnique({ where: { id: subtaskId }, select: { id: true, taskId: true } });
    if (!current || current.taskId !== id) {
      return NextResponse.json({ error: "Subtarefa não encontrada" }, { status: 404 });
    }
    await prisma.taskSubtask.delete({ where: { id: subtaskId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
