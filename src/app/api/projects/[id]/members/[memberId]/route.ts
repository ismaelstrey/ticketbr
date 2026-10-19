import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/server/services/staff-context";
import { ProjectMemberUpdateSchema } from "../../../schemas";

// Projeção segura do membro do projeto (inclui dados públicos do usuário)
const memberSelect = {
  id: true,
  userId: true,
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } }
} as const;

// Verifica se o usuário autenticado pode gerenciar membros e carrega o membro alvo
async function authorizeMemberChange(session: { userId: string; role: string }, projectId: string, memberId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, ownerUserId: true } });
  if (!project) return "NOT_FOUND" as const;
  if (session.role !== "ADMIN" && project.ownerUserId !== session.userId) return "FORBIDDEN" as const;

  const member = await prisma.projectMember.findUnique({ where: { id: memberId }, select: { id: true, projectId: true, role: true } });
  if (!member || member.projectId !== projectId) return "NOT_FOUND" as const;

  return { project, member };
}

// PATCH atualiza o papel de um membro do projeto (restrito ao dono ou admin)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id, memberId } = await params;

    const auth = await authorizeMemberChange(session, id, memberId);
    if (auth === "NOT_FOUND") return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    if (auth === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (auth.member.role === "owner") {
      return NextResponse.json({ error: "O papel do dono do projeto não pode ser alterado" }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = ProjectMemberUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role: parsed.data.role },
      select: memberSelect
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Bad Request" },
      { status }
    );
  }
}

// DELETE remove um membro do projeto (restrito ao dono ou admin)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const session = await requireStaffSession();
    const { id, memberId } = await params;

    const auth = await authorizeMemberChange(session, id, memberId);
    if (auth === "NOT_FOUND") return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    if (auth === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (auth.member.role === "owner") {
      return NextResponse.json({ error: "O dono do projeto não pode ser removido" }, { status: 409 });
    }

    await prisma.projectMember.delete({ where: { id: memberId } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}
