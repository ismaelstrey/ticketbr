import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export type CustomerContext = {
  user: { id: string; email: string; name: string; role: string };
  solicitante: { id: string; nome_fantasia: string; razao_social: string; email: string };
  member: { id: string; solicitante_id: string; isAdmin: boolean };
};

export async function requireCustomerContext(): Promise<CustomerContext> {
  const session = await getSession();
  const userId = String((session as any)?.id || (session as any)?.sub || "").trim();
  const role = String((session as any)?.role || "").trim();

  if (!userId || role !== "CUSTOMER") {
    throw new Error("UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true }
  });

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  const member = await prisma.funcionario.findUnique({
    where: { userId: user.id },
    select: { id: true, solicitante_id: true, isAdmin: true }
  });

  if (!member?.solicitante_id) {
    throw new Error("FORBIDDEN");
  }

  const solicitante = await prisma.solicitante.findUnique({
    where: { id: member.solicitante_id },
    select: { id: true, nome_fantasia: true, razao_social: true, email: true }
  });

  if (!solicitante) {
    throw new Error("FORBIDDEN");
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, role: String(user.role) },
    solicitante,
    member
  };
}

export async function requireCompanyAdminContext() {
  const ctx = await requireCustomerContext();
  if (!ctx.member.isAdmin) {
    throw new Error("FORBIDDEN");
  }
  return ctx;
}

