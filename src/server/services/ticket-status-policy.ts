import type { DbStatus } from "@/server/ticket-mappers";

/**
 * Regras de negócio de status e SLA do ticket.
 * Centraliza a máquina de estados e o cálculo do prazo de SLA para
 * evitar valores mágicos espalhados pelo serviço e pelas rotas.
 */

/** SLA padrão (em horas) quando não há configuração específica. */
export const DEFAULT_SLA_HOURS = 8;

/** SLA por empresa (contrato). Usado quando o tipo de ticket não define sla_horas. */
export const COMPANY_SLA_HOURS: Record<string, number> = {
  "ACEM PRIME SERVIÇOS DE INTERNET LTDA": 6,
  NETMITT: 4,
  "LP INTERNET": 8
};

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
  /** Empresa/solicitante, usada para resolver SLA por contrato. */
  company?: string | null;
}

/**
 * Resolve o prazo de SLA do ticket seguindo a prioridade:
 * 1) solutionSlaAt explícito; 2) sla_horas do tipo de ticket;
 * 3) SLA por empresa; 4) SLA padrão.
 */
export function resolveSlaDeadline(input: SlaDeadlineInput): Date {
  if (input.solutionSlaAt) {
    return input.solutionSlaAt;
  }

  const tipoHours =
    typeof input.tipoTicketSlaHours === "number" && input.tipoTicketSlaHours > 0
      ? input.tipoTicketSlaHours
      : undefined;

  const hours =
    tipoHours ??
    COMPANY_SLA_HOURS[String(input.company ?? "")] ??
    DEFAULT_SLA_HOURS;

  return new Date(input.createdAt.getTime() + hours * 60 * 60 * 1000);
}
