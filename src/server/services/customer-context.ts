import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export type CustomerContext = {
  user: { id: string; email: string; name: string; role: string };
  solicitante: {
    id: string;
    nome_fantasia: string;
    razao_social: string;
    email: string;
    /** Serviço interrompido por contrato (cancelado/vencido/suspenso). O acesso é mantido. */
    servico_bloqueado: boolean;
    servico_bloqueado_motivo: string | null;
  };
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
    select: {
      id: true,
      nome_fantasia: true,
      razao_social: true,
      email: true,
      status: true,
      servico_bloqueado: true,
      servico_bloqueado_motivo: true
    }
  });

  if (!solicitante) {
    throw new Error("FORBIDDEN");
  }

  // Empresa desativada bloqueia todos os acessos do cliente (distinto do bloqueio por contrato)
  if (solicitante.status === false) {
    throw new Error("FORBIDDEN");
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, role: String(user.role) },
    solicitante: {
      id: solicitante.id,
      nome_fantasia: solicitante.nome_fantasia,
      razao_social: solicitante.razao_social,
      email: solicitante.email,
      servico_bloqueado: solicitante.servico_bloqueado,
      servico_bloqueado_motivo: solicitante.servico_bloqueado_motivo
    },
    member
  };
}

/**
 * Contexto do cliente para rotas de escrita.
 * O acesso é mantido com o serviço interrompido por contrato; somente a empresa
 * desativada (`status = false`) bloqueia a navegação no portal.
 */
export async function requireCustomerContextAtivo(): Promise<CustomerContext> {
  return requireCustomerContext();
}

export async function requireCompanyAdminContext() {
  const ctx = await requireCustomerContext();
  if (!ctx.member.isAdmin) {
    throw new Error("FORBIDDEN");
  }
  return ctx;
}

