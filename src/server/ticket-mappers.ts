export type UiStatus = "todo" | "doing" | "paused" | "done";
export type UiPriority = "Alta" | "Média" | "Sem prioridade";

export type DbStatus = "TODO" | "DOING" | "PAUSED" | "DONE";
export type DbPriority = "HIGH" | "MEDIUM" | "NONE";

const uiToDbStatus: Record<UiStatus, DbStatus> = {
  todo: "TODO",
  doing: "DOING",
  paused: "PAUSED",
  done: "DONE"
};

const dbToUiStatus: Record<DbStatus, UiStatus> = {
  TODO: "todo",
  DOING: "doing",
  PAUSED: "paused",
  DONE: "done"
};

const uiToDbPriority: Record<UiPriority, DbPriority> = {
  Alta: "HIGH",
  "Média": "MEDIUM",
  "Sem prioridade": "NONE"
};

const dbToUiPriority: Record<DbPriority, UiPriority> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  NONE: "Sem prioridade"
};

export function toPrismaStatus(status: UiStatus): DbStatus {
  return uiToDbStatus[status];
}

export function fromPrismaStatus(status: DbStatus): UiStatus {
  return dbToUiStatus[status];
}

export function toPrismaPriority(priority: UiPriority): DbPriority {
  return uiToDbPriority[priority];
}

export function fromPrismaPriority(priority: DbPriority): UiPriority {
  return dbToUiPriority[priority];
}
