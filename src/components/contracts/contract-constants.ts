export type ContratoStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED";
export type SlaTermScope = "TIPO_TICKET" | "CATEGORIA" | "PRIORIDADE" | "GLOBAL";
export type TicketPriorityKey = "HIGH" | "MEDIUM" | "NONE";

export const contratoStatusLabels: Record<ContratoStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  EXPIRED: "Vencido",
  CANCELLED: "Cancelado"
};

export const slaTermScopeLabels: Record<SlaTermScope, string> = {
  TIPO_TICKET: "Tipo de ticket",
  CATEGORIA: "Categoria",
  PRIORIDADE: "Prioridade",
  GLOBAL: "Global"
};

export const ticketPriorityLabels: Record<TicketPriorityKey, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  NONE: "Sem prioridade"
};

/** Formata um valor monetário (aceita string/Decimal da API) em BRL. */
export function formatCurrencyBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formata uma data ISO em `dd/mm/aaaa`, tolerando valores nulos. */
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

/** Formata data e hora em pt-BR. */
export function formatDateTimeBR(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

/** Converte string ISO em valor aceito pelo `<input type="date">`. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
