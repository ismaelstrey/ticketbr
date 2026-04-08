import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/server/services/staff-context";
import { ProjectUpsertSchema } from "../schemas";

async function ensureCanReadProject(session: { userId: string; role: string }, id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      ownerUser: { select: { id: true, name: true, email: true } },
      members: { select: { id: true, userId: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true } } } }
    }
  });
  if (!project) return null;
  if (session.role === "ADMIN") return project;

  const isMember = project.ownerUserId === session.userId || project.members.some((m) => m.userId === session.userId);
  return isMember ? project : "FORBIDDEN";
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;

    const project = await ensureCanReadProject(session, id);
    if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    if (project === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ data: project });
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

    const current = await prisma.project.findUnique({ where: { id }, select: { id: true, ownerUserId: true, startDate: true, endDate: true } });
    if (!current) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    if (session.role !== "ADMIN" && current.ownerUserId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const input = ProjectUpsertSchema.partial().parse(body);

    const nextStart = input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : current.startDate;
    const nextEnd = input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : current.endDate;

    if (nextStart && nextEnd && nextEnd < nextStart) {
      return NextResponse.json({ error: "Data final não pode ser anterior à data inicial" }, { status: 400 });
    }

    const archivedAt = input.status === "ARCHIVED" ? new Date() : input.status ? null : undefined;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status, archivedAt } : {}),
        ...(input.startDate !== undefined ? { startDate: input.startDate ? new Date(input.startDate) : null } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {})
      },
      include: {
        ownerUser: { select: { id: true, name: true, email: true } },
        members: { select: { id: true, userId: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true } } } }
      }
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Bad Request" }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;

    const current = await prisma.project.findUnique({ where: { id }, select: { id: true, ownerUserId: true } });
    if (!current) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    if (session.role !== "ADMIN" && current.ownerUserId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

