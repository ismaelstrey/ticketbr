import type { SlaSource, SlaTermScope, TicketPriority } from "../../../prisma/generated/enums";
import {
  addBusinessHours,
  parseHorarioComercial,
  type HorarioComercialConfig
} from "./business-hours";

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
 *
 * O prazo de resposta (`resolveResponseSla`) usa a mesma hierarquia de termos,
 * contrato e política, porém sem prazo padrão: sem configuração de resposta o
 * ticket fica sem prazo de resposta.
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
  /** SLA de resposta (h) específico do termo. */
  slaRespostaHoras?: number | null;
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

/** Seleciona o termo ativo mais específico que casa com o ticket e define o prazo buscado. */
function selectTermo(
  termos: SlaContratoTermo[] | null | undefined,
  ticket: SlaTicketRef | null | undefined,
  getHours: (termo: SlaContratoTermo) => number | undefined
): SlaContratoTermo | undefined {
  if (!termos?.length) return undefined;

  for (const escopo of TERM_SCOPE_ORDER) {
    const encontrado = termos.find(
      (termo) =>
        termo.ativo &&
        termo.escopo === escopo &&
        getHours(termo) !== undefined &&
        termoMatchesTicket(termo, escopo, ticket)
    );
    if (encontrado) return encontrado;
  }

  return undefined;
}

/** Janela comercial efetiva da política herdada pelo contrato (opt-in). */
function resolveHorarioComercial(policy: SlaPolicyRef | null | undefined): HorarioComercialConfig | null {
  return policy?.horarioComercialAtivo === true
    ? parseHorarioComercial(policy.horarioComercial ?? null, policy.feriados ?? null)
    : null;
}

/** Aplica o prazo (horas úteis quando há janela comercial, senão horas corridas). */
function buildDeadline(
  createdAt: Date,
  horas: number,
  horarioComercial: HorarioComercialConfig | null
): Date {
  return horarioComercial
    ? addBusinessHours(createdAt, horas, horarioComercial)
    : new Date(createdAt.getTime() + horas * MS_PER_HOUR);
}

/**
 * Resolve o prazo de SLA seguindo a hierarquia documentada.
 * Retorna sempre um resultado: na ausência de qualquer configuração aplica
 * `DEFAULT_SLA_HOURS` com fonte `FALLBACK`.
 */
export function resolveSla(ctx: SlaResolutionContext): SlaResolution {
  const { createdAt } = ctx;
  const horarioComercial = resolveHorarioComercial(ctx.contrato?.policy ?? null);

  const build = (horas: number, fonte: SlaSource): SlaResolution => ({
    horas,
    fonte,
    deadline: buildDeadline(createdAt, horas, horarioComercial)
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
    const termo = selectTermo(contrato.termos, ctx.ticket, (t) => positiveHours(t.slaSolucaoHoras));
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

/**
 * Resolve o prazo de resposta do ticket com a mesma hierarquia do prazo de solução
 * (termo do contrato → contrato → política global).
 *
 * Diferente da solução, não há prazo de resposta padrão: quando nenhuma fonte
 * define horas de resposta, retorna `null` em vez de inventar um prazo.
 */
export function resolveResponseSla(ctx: SlaResolutionContext): SlaResolution | null {
  const contrato = ctx.contrato ?? null;
  if (!contrato) return null;

  const horarioComercial = resolveHorarioComercial(contrato.policy ?? null);
  const { createdAt } = ctx;

  const build = (horas: number, fonte: SlaSource): SlaResolution => ({
    horas,
    fonte,
    deadline: buildDeadline(createdAt, horas, horarioComercial)
  });

  const termo = selectTermo(contrato.termos, ctx.ticket, (t) => positiveHours(t.slaRespostaHoras));
  const termoHours = positiveHours(termo?.slaRespostaHoras);
  if (termoHours !== undefined) {
    return build(termoHours, "CONTRACT_TERM");
  }

  const contratoHours = positiveHours(contrato.slaRespostaHoras);
  if (contratoHours !== undefined) {
    return build(contratoHours, "CONTRACT");
  }

  const policyHours = positiveHours(contrato.policy?.slaRespostaHoras);
  if (policyHours !== undefined) {
    return build(policyHours, "GLOBAL_POLICY");
  }

  return null;
}
