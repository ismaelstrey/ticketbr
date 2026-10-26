import type { SlaSource, SlaTermScope, TicketPriority } from "../../../prisma/generated/enums";
import { addBusinessHours, parseHorarioComercial } from "./business-hours";

/**
 * Resolução do prazo de SLA do ticket.
 *
 * Função pura (sem acesso a banco) para ser facilmente testável. Quem consulta o
 * contrato/política vigente é a camada de serviço e passa tudo pronto aqui.
 *
 * Hierarquia de precedência:
 * 1. `solutionSlaAt` — prazo explícito gravado manualmente.
 * 2. `tipoTicketSlaHours` — SLA do tipo de ticket (prioridade máxima).
 * 3. Termo de SLA do contrato que casa com o ticket (tipo → categoria → prioridade → global).
 * 4. `contrato.slaSolucaoHoras` — SLA diferenciado da empresa.
 * 5. `contrato.policy.slaSolucaoHoras` — política global herdada pelo contrato.
 * 6. `DEFAULT_SLA_HOURS` — último recurso.
 */

/** SLA padrão (em horas) quando nenhuma outra fonte define o prazo. */
export const DEFAULT_SLA_HOURS = 8;

const MS_PER_HOUR = 60 * 60 * 1000;

/** Termo de SLA de um contrato, no formato consumido pelo resolver. */
export interface SlaContratoTermo {
  escopo: SlaTermScope;
  tipoTicketId?: string | null;
  categoriaId?: string | null;
  prioridade?: TicketPriority | null;
  slaSolucaoHoras: number;
  ativo: boolean;
}

/** Política global de SLA herdada pelo contrato. */
export interface SlaPolicyRef {
  slaSolucaoHoras: number;
  slaRespostaHoras?: number | null;
  /** Habilita o cálculo em horas úteis (janela comercial + feriados). */
  horarioComercialAtivo?: boolean | null;
  /** Janela comercial (JSON): timezone, diasUteis, inicio e fim. */
  horarioComercial?: unknown;
  /** Feriados (`yyyy-MM-dd`) considerados no cálculo em horas úteis. */
  feriados?: unknown;
}

/** Contrato vigente aplicável ao ticket. */
export interface SlaContratoRef {
  slaSolucaoHoras?: number | null;
  slaRespostaHoras?: number | null;
  policy?: SlaPolicyRef | null;
  termos?: SlaContratoTermo[] | null;
}

/** Dados do ticket usados para casar o termo de SLA do contrato. */
export interface SlaTicketRef {
  tipoTicketId?: string | null;
  categoriaId?: string | null;
  priority?: TicketPriority | null;
}

export interface SlaResolutionContext {
  /** Data de criação do ticket (base do cálculo). */
  createdAt: Date;
  /** Prazo de solução já persistido no ticket (tem prioridade sobre tudo). */
  solutionSlaAt?: Date | null;
  /** SLA configurado no tipo de ticket (sla_horas). */
  tipoTicketSlaHours?: number | null;
  /** Contexto do ticket para casar termos do contrato. */
  ticket?: SlaTicketRef | null;
  /** Contrato vigente da empresa (nulo quando não há contrato aplicável). */
  contrato?: SlaContratoRef | null;
}

export interface SlaResolution {
  /** Prazo final de solução. */
  deadline: Date;
  /** Horas de SLA efetivamente aplicadas. */
  horas: number;
  /** Origem do SLA aplicado (auditoria). */
  fonte: SlaSource;
}

/** Ordem de especificidade dos termos do contrato (mais específico primeiro). */
const TERM_SCOPE_ORDER: readonly SlaTermScope[] = [
  "TIPO_TICKET",
  "CATEGORIA",
  "PRIORIDADE",
  "GLOBAL"
];

/** Normaliza um valor de horas: retorna o número apenas quando for positivo e finito. */
function positiveHours(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Verifica se o termo casa com o escopo do ticket informado. */
function termoMatchesTicket(
  termo: SlaContratoTermo,
  escopo: SlaTermScope,
  ticket: SlaTicketRef | null | undefined
): boolean {
  switch (escopo) {
    case "TIPO_TICKET":
      return Boolean(ticket?.tipoTicketId) && termo.tipoTicketId === ticket?.tipoTicketId;
    case "CATEGORIA":
      return Boolean(ticket?.categoriaId) && termo.categoriaId === ticket?.categoriaId;
    case "PRIORIDADE":
      return Boolean(ticket?.priority) && termo.prioridade === ticket?.priority;
    case "GLOBAL":
      return true;
    default:
      return false;
  }
}

/** Seleciona o termo ativo mais específico que casa com o ticket. */
function selectTermo(
  termos: SlaContratoTermo[] | null | undefined,
  ticket: SlaTicketRef | null | undefined
): SlaContratoTermo | undefined {
  if (!termos?.length) return undefined;

  for (const escopo of TERM_SCOPE_ORDER) {
    const encontrado = termos.find(
      (termo) =>
        termo.ativo &&
        termo.escopo === escopo &&
        positiveHours(termo.slaSolucaoHoras) !== undefined &&
        termoMatchesTicket(termo, escopo, ticket)
    );
    if (encontrado) return encontrado;
  }

  return undefined;
}

/**
 * Resolve o prazo de SLA seguindo a hierarquia documentada.
 * Retorna sempre um resultado: na ausência de qualquer configuração aplica
 * `DEFAULT_SLA_HOURS` com fonte `FALLBACK`.
 */
export function resolveSla(ctx: SlaResolutionContext): SlaResolution {
  const { createdAt } = ctx;

  // Horário comercial é opt-in na política global herdada pelo contrato.
  const politica = ctx.contrato?.policy ?? null;
  const horarioComercial =
    politica?.horarioComercialAtivo === true
      ? parseHorarioComercial(politica.horarioComercial ?? null, politica.feriados ?? null)
      : null;

  const build = (horas: number, fonte: SlaSource): SlaResolution => ({
    horas,
    fonte,
    deadline: horarioComercial
      ? addBusinessHours(createdAt, horas, horarioComercial)
      : new Date(createdAt.getTime() + horas * MS_PER_HOUR)
  });

  if (ctx.solutionSlaAt) {
    return {
      deadline: ctx.solutionSlaAt,
      horas: Math.round((ctx.solutionSlaAt.getTime() - createdAt.getTime()) / MS_PER_HOUR),
      fonte: "MANUAL"
    };
  }

  const tipoHours = positiveHours(ctx.tipoTicketSlaHours);
  if (tipoHours !== undefined) {
    return build(tipoHours, "TICKET_TYPE");
  }

  const contrato = ctx.contrato ?? null;
  if (contrato) {
    const termo = selectTermo(contrato.termos, ctx.ticket);
    const termoHours = positiveHours(termo?.slaSolucaoHoras);
    if (termoHours !== undefined) {
      return build(termoHours, "CONTRACT_TERM");
    }

    const contratoHours = positiveHours(contrato.slaSolucaoHoras);
    if (contratoHours !== undefined) {
      return build(contratoHours, "CONTRACT");
    }

    const policyHours = positiveHours(contrato.policy?.slaSolucaoHoras);
    if (policyHours !== undefined) {
      return build(policyHours, "GLOBAL_POLICY");
    }
  }

  return build(DEFAULT_SLA_HOURS, "FALLBACK");
}
