import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/server/services/staff-context";
import { ProjectMemberAddSchema } from "../../schemas";

// Projeção segura do membro do projeto (inclui dados públicos do usuário)
const memberSelect = {
  id: true,
  userId: true,
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } }
} as const;

// Carrega o projeto com seus membros para validação de acesso
async function loadProjectForAccess(id: string) {
  return prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      ownerUserId: true,
      members: { select: memberSelect, orderBy: { createdAt: "asc" } }
    }
  });
}

// GET lista os membros do projeto (permitido para admin, dono ou membro)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;

    const project = await loadProjectForAccess(id);
    if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

    const canRead =
      session.role === "ADMIN" ||
      project.ownerUserId === session.userId ||
      project.members.some((m) => m.userId === session.userId);
    if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ data: project.members });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

// POST adiciona um membro ao projeto (restrito ao dono ou admin)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id }, select: { id: true, ownerUserId: true } });
    if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    if (session.role !== "ADMIN" && project.ownerUserId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = ProjectMemberAddSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, role: true } });
    if (!user || (user.role !== "ADMIN" && user.role !== "AGENT")) {
      return NextResponse.json({ error: "Usuário inválido" }, { status: 400 });
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: parsed.data.userId } },
      select: { id: true }
    });
    if (existing) return NextResponse.json({ error: "Usuário já é membro do projeto" }, { status: 409 });

    const created = await prisma.projectMember.create({
      data: { projectId: id, userId: parsed.data.userId, role: parsed.data.role },
      select: memberSelect
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Bad Request" },
      { status }
    );
  }
}
