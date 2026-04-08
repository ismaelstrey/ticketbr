import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/server/services/staff-context";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  try {
    await requireStaffSession();
    const { id, linkId } = await params;
    const current = await prisma.taskTicketLink.findUnique({ where: { id: linkId }, select: { id: true, taskId: true } });
    if (!current || current.taskId !== id) {
      return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 404 });
    }
    await prisma.taskTicketLink.delete({ where: { id: linkId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
