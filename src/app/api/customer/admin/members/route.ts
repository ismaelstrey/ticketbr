import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdminContext } from "@/server/services/customer-context";
import { hash } from "bcryptjs";
import { writeAuditLog } from "@/server/services/audit-log";

const CreateMemberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  telefone: z.string().min(8),
  isAdmin: z.boolean().optional()
});

export async function GET() {
  try {
    const ctx = await requireCompanyAdminContext();
    const members = await prisma.funcionario.findMany({
      where: { solicitante_id: ctx.solicitante.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        isAdmin: true,
        user: { select: { id: true, email: true, name: true } }
      }
    });

    return NextResponse.json({
      data: members.map((m) => ({
        id: m.id,
        name: m.nome,
        email: m.email || m.user.email,
        telefone: m.telefone,
        isAdmin: m.isAdmin,
        userId: m.user.id
      }))
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireCompanyAdminContext();
    const raw = await request.json().catch(() => ({}));
    const input = CreateMemberSchema.parse(raw);

    const email = input.email.trim().toLowerCase();
    const passwordHash = await hash(input.password, 10);

    const created = await prisma.user.create({
      data: {
        email,
        name: input.name,
        password: passwordHash,
        role: "CUSTOMER"
      },
      select: { id: true, email: true, name: true }
    });

    const member = await prisma.funcionario.create({
      data: {
        solicitante_id: ctx.solicitante.id,
        userId: created.id,
        nome: input.name,
        email,
        telefone: input.telefone,
        isAdmin: Boolean(input.isAdmin)
      },
      select: { id: true, isAdmin: true }
    });

    await writeAuditLog({
      solicitanteId: ctx.solicitante.id,
      actorUserId: ctx.user.id,
      action: "company.member.create",
      entity: "user",
      entityId: created.id,
      metadata: { memberId: member.id, email, isAdmin: member.isAdmin }
    });

    return NextResponse.json({
      data: { id: created.id, email: created.email, name: created.name, memberId: member.id, isAdmin: member.isAdmin }
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.flatten() }, { status: 400 });
    }
    const message = String(error?.message || "");
    if (message.includes("Unique constraint") || message.includes("unique")) {
      return NextResponse.json({ error: "Email já está em uso" }, { status: 409 });
    }
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

