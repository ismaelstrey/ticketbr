import type { DbStatus } from "@/server/ticket-mappers";
import { resolveSla, type SlaContratoRef, type SlaTicketRef } from "./sla-resolver";

/**
 * Regras de negócio de status e SLA do ticket.
 * Centraliza a máquina de estados e delega o cálculo do prazo de SLA ao
 * `sla-resolver`, evitando valores mágicos espalhados pelo serviço e pelas rotas.
 */

export { DEFAULT_SLA_HOURS } from "./sla-resolver";

/**
 * Máquina de estados do ticket.
 * Define para quais status um ticket pode transicionar a partir do status atual.
 */
export const TICKET_STATUS_TRANSITIONS: Record<DbStatus, DbStatus[]> = {
  TODO: ["DOING", "PAUSED", "DONE"],
  DOING: ["TODO", "PAUSED", "DONE"],
  PAUSED: ["TODO", "DOING", "DONE"],
  // Ticket concluído só pode ser reaberto (voltar para andamento)
  DONE: ["DOING"]
};

/** Status que exigem que um motivo de pausa seja informado. */
export const STATUSES_REQUIRING_PAUSE_REASON: readonly DbStatus[] = ["PAUSED"];

/** Erro lançado quando uma transição de status não é permitida pela máquina de estados. */
export class InvalidStatusTransitionError extends Error {
  readonly from: DbStatus;
  readonly to: DbStatus;

  constructor(from: DbStatus, to: DbStatus) {
    super(`Transição de status inválida: ${from} -> ${to}`);
    this.name = "InvalidStatusTransitionError";
    this.from = from;
    this.to = to;
  }
}

/**
 * Verifica se a transição de `from` para `to` é permitida.
 * A transição para o mesmo status é considerada válida (idempotente).
 */
export function canTransition(from: DbStatus, to: DbStatus): boolean {
  if (from === to) return true;
  return TICKET_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Valida a transição e lança InvalidStatusTransitionError quando não permitida. */
export function assertTransition(from: DbStatus, to: DbStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidStatusTransitionError(from, to);
  }
}

/** Indica se o status exige motivo de pausa. */
export function requiresPauseReason(status: DbStatus): boolean {
  return STATUSES_REQUIRING_PAUSE_REASON.includes(status);
}

export interface SlaDeadlineInput {
  /** Data de criação do ticket (base do cálculo). */
  createdAt: Date;
  /** Prazo de solução já persistido no ticket (tem prioridade). */
  solutionSlaAt?: Date | null;
  /** SLA configurado no tipo de ticket (sla_horas), quando disponível. */
  tipoTicketSlaHours?: number | null;
  /** Contexto do ticket para casar termos de SLA do contrato. */
  ticket?: SlaTicketRef | null;
  /** Contrato vigente da empresa (SLA diferenciado, termos e política herdada). */
  contrato?: SlaContratoRef | null;
}

/**
 * Resolve o prazo de SLA do ticket delegando ao `sla-resolver`.
 * Mantido por compatibilidade com os pontos de criação de ticket.
 */
export function resolveSlaDeadline(input: SlaDeadlineInput): Date {
  return resolveSla({
    createdAt: input.createdAt,
    solutionSlaAt: input.solutionSlaAt,
    tipoTicketSlaHours: input.tipoTicketSlaHours,
    ticket: input.ticket,
    contrato: input.contrato
  }).deadline;
}

