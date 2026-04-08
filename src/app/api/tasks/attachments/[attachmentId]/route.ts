import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/server/services/staff-context";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
  try {
    await requireStaffSession();
    const { attachmentId } = await params;
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, fileName: true, mimeType: true, data: true }
    });

    if (!attachment) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    return new NextResponse(attachment.data as any, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`
      }
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
  try {
    await requireStaffSession();
    const { attachmentId } = await params;
    await prisma.taskAttachment.delete({ where: { id: attachmentId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

