import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireStaffSession } from "@/server/services/staff-context";

const UploadSchema = z.object({
  fileName: z.string().min(1).max(240),
  mimeType: z.string().min(1).max(120).optional().nullable(),
  fileSize: z.number().int().positive().max(8_000_000).optional().nullable(),
  base64: z.string().min(10)
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaffSession();
    const { id } = await params;
    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true, mimeType: true, fileSize: true, createdAt: true, createdById: true }
    });
    return NextResponse.json({ data: attachments });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = UploadSchema.parse(body);

    const raw = input.base64.includes(",") ? input.base64.split(",")[1] : input.base64;
    const buffer = Buffer.from(raw, "base64");
    if (buffer.length > 8_000_000) {
      return NextResponse.json({ error: "Arquivo excede 8MB" }, { status: 413 });
    }

    const created = await prisma.taskAttachment.create({
      data: {
        taskId: id,
        fileName: input.fileName,
        mimeType: input.mimeType ?? null,
        fileSize: input.fileSize ?? buffer.length,
        data: buffer,
        createdById: session.userId
      },
      select: { id: true, fileName: true, mimeType: true, fileSize: true, createdAt: true, createdById: true }
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

