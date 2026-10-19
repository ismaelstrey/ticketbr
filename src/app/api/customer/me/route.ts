import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/server/services/customer-context";
import { writeAuditLog } from "@/server/services/audit-log";

const MIN_PASSWORD_LENGTH = 8;

export async function GET() {
  try {
    const ctx = await requireCustomerContext();
    return NextResponse.json({
      user: ctx.user,
      company: {
        id: ctx.solicitante.id,
        name: ctx.solicitante.nome_fantasia || ctx.solicitante.razao_social,
        email: ctx.solicitante.email
      },
      member: { id: ctx.member.id, isAdmin: ctx.member.isAdmin }
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

/**
 * Atualiza os dados do próprio usuário do portal (nome e/ou senha).
 * A troca de senha exige a confirmação da senha atual.
 */
export async function PATCH(request: Request) {
  try {
    const ctx = await requireCustomerContext();
    const body = (await request.json().catch(() => ({}))) as {
      name?: unknown;
      currentPassword?: unknown;
      newPassword?: unknown;
    };

    const hasName = typeof body.name === "string";
    const name = hasName ? String(body.name).trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";

    const userData: { name?: string; password?: string } = {};

    if (hasName) {
      if (!name) {
        return NextResponse.json({ error: "Informe o nome." }, { status: 400 });
      }
      userData.name = name;
    }

    if (newPassword) {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          { error: `A nova senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` },
          { status: 400 }
        );
      }

      const current = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { password: true }
      });

      const isCurrentValid = current ? await compare(currentPassword, current.password) : false;
      if (!isCurrentValid) {
        return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
      }

      userData.password = await hash(newPassword, 10);
    }

    if (Object.keys(userData).length === 0) {
      return NextResponse.json({ error: "Nenhuma alteração informada." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: ctx.user.id },
      data: userData,
      select: { id: true, email: true, name: true, role: true }
    });

    // Mantém o nome do funcionário vinculado em sincronia com o nome da conta
    if (userData.name) {
      await prisma.funcionario.updateMany({
        where: { userId: ctx.user.id },
        data: { nome: userData.name }
      });
    }

    await writeAuditLog({
      solicitanteId: ctx.solicitante.id,
      actorUserId: ctx.user.id,
      action: "customer.profile_updated",
      entity: "user",
      entityId: ctx.user.id,
      metadata: { passwordChanged: Boolean(userData.password) }
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: String(updated.role)
      }
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

