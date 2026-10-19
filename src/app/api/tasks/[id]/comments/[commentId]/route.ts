import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/server/services/staff-context";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await requireStaffSession();
    const { id, commentId } = await params;

    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      select: { id: true, taskId: true, authorId: true }
    });

    if (!comment || comment.taskId !== id) {
      return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 });
    }

    // Apenas o autor ou um administrador podem excluir o comentário
    if (session.role !== "ADMIN" && comment.authorId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.taskComment.delete({ where: { id: commentId } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}
