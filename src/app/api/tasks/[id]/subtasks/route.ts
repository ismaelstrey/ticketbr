import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireStaffSession } from "@/server/services/staff-context";

const CreateSubtaskSchema = z.object({
  title: z.string().min(1).max(220)
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaffSession();
    const { id } = await params;
    const items = await prisma.taskSubtask.findMany({ where: { taskId: id }, orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ data: items });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaffSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = CreateSubtaskSchema.parse(body);

    const last = await prisma.taskSubtask.findFirst({ where: { taskId: id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const nextOrder = (last?.sortOrder ?? 0) + 1000;

    const created = await prisma.taskSubtask.create({
      data: { taskId: id, title: input.title, sortOrder: nextOrder },
      select: { id: true, taskId: true, title: true, isDone: true, sortOrder: true, createdAt: true, updatedAt: true }
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.flatten() }, { status: 400 });
    }
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

