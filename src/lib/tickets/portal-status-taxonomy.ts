export type DbTicketStatus = "TODO" | "DOING" | "PAUSED" | "DONE";
export type UiTicketStatus = "todo" | "doing" | "paused" | "done";

export type PortalStatusTaxonomyKey =
  | "REQUEST_RECEIVED"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER_ACTION"
  | "RESOLVED";

export type PortalStatusTone = "info" | "warning" | "success";

export interface PortalStatusCopyEntry {
  key: PortalStatusTaxonomyKey;
  tone: PortalStatusTone;
  label: string;
  timelineTitle: string;
  description: string;
  nextActionHint: string;
}

const uiToDbStatus: Record<UiTicketStatus, DbTicketStatus> = {
  todo: "TODO",
  doing: "DOING",
  paused: "PAUSED",
  done: "DONE"
};

const dbToPortalStatusKey: Record<DbTicketStatus, PortalStatusTaxonomyKey> = {
  TODO: "REQUEST_RECEIVED",
  DOING: "IN_PROGRESS",
  PAUSED: "WAITING_CUSTOMER_ACTION",
  DONE: "RESOLVED"
};

export const portalStatusCopyMap: Record<PortalStatusTaxonomyKey, PortalStatusCopyEntry> = {
  REQUEST_RECEIVED: {
    key: "REQUEST_RECEIVED",
    tone: "info",
    label: "Solicitação recebida",
    timelineTitle: "Recebemos sua solicitação",
    description: "Seu ticket foi aberto e está na fila para triagem inicial.",
    nextActionHint: "Você será avisado quando um atendente iniciar a análise."
  },
  IN_PROGRESS: {
    key: "IN_PROGRESS",
    tone: "info",
    label: "Em atendimento",
    timelineTitle: "Estamos trabalhando no seu ticket",
    description: "Um atendente está analisando e tratando a sua solicitação.",
    nextActionHint: "Se precisar complementar, responda no histórico do ticket."
  },
  WAITING_CUSTOMER_ACTION: {
    key: "WAITING_CUSTOMER_ACTION",
    tone: "warning",
    label: "Aguardando sua ação",
    timelineTitle: "Precisamos de uma confirmação sua",
    description: "O atendimento foi pausado até recebermos informações complementares.",
    nextActionHint: "Envie os dados solicitados para retomarmos o atendimento."
  },
  RESOLVED: {
    key: "RESOLVED",
    tone: "success",
    label: "Concluído",
    timelineTitle: "Ticket concluído",
    description: "Sua solicitação foi finalizada com sucesso.",
    nextActionHint: "Se necessário, você pode abrir um novo ticket."
  }
};

export const portalStatusFilterOptions: Array<{ value: DbTicketStatus; label: string }> = [
  { value: "TODO", label: portalStatusCopyMap.REQUEST_RECEIVED.label },
  { value: "DOING", label: portalStatusCopyMap.IN_PROGRESS.label },
  { value: "PAUSED", label: portalStatusCopyMap.WAITING_CUSTOMER_ACTION.label },
  { value: "DONE", label: portalStatusCopyMap.RESOLVED.label }
];

function toDbStatus(value: string): DbTicketStatus | null {
  if (!value) return null;
  const normalized = value.trim();

  if (normalized in uiToDbStatus) {
    return uiToDbStatus[normalized as UiTicketStatus];
  }

  const upper = normalized.toUpperCase();
  if (upper === "TODO" || upper === "DOING" || upper === "PAUSED" || upper === "DONE") {
    return upper;
  }

  return null;
}

export function getPortalStatusKey(status: string): PortalStatusTaxonomyKey | null {
  const dbStatus = toDbStatus(status);
  if (!dbStatus) return null;
  return dbToPortalStatusKey[dbStatus];
}

export function getPortalStatusCopy(status: string): PortalStatusCopyEntry | null {
  const key = getPortalStatusKey(status);
  if (!key) return null;
  return portalStatusCopyMap[key];
}

export function getPortalStatusLabel(status: string): string {
  return getPortalStatusCopy(status)?.label ?? status;
}
