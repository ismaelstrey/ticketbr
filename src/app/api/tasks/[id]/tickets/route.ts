import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireStaffSession } from "@/server/services/staff-context";

const LinkSchema = z.object({
  ticketId: z.string().min(1)
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaffSession();
    const { id } = await params;
    const links = await prisma.taskTicketLink.findMany({ where: { taskId: id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data: links });
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
    const input = LinkSchema.parse(body);
    const created = await prisma.taskTicketLink.create({ data: { taskId: id, ticketId: input.ticketId } });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.flatten() }, { status: 400 });
    }
    const message = String(error?.message || "");
    if (message.includes("Unique constraint") || message.includes("unique")) {
      return NextResponse.json({ error: "Ticket já vinculado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

