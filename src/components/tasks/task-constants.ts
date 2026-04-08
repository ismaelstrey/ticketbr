import { TaskPriority, TaskStatus } from "@/types/task";

export const taskStatusLabels: Record<TaskStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída"
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa"
};

export const taskColumns: Array<{ key: TaskStatus; title: string; color: string }> = [
  { key: "PENDING", title: "Pendente", color: "#ff5d5d" },
  { key: "IN_PROGRESS", title: "Em andamento", color: "#69cf57" },
  { key: "DONE", title: "Concluída", color: "#8e8e8e" }
];

export function getDueState(dueAt: string | null, status: TaskStatus) {
  if (!dueAt) return "none" as const;
  if (status === "DONE") return "none" as const;
  const dueMs = new Date(dueAt).getTime();
  if (Number.isNaN(dueMs)) return "none" as const;
  const now = Date.now();
  if (dueMs < now) return "overdue" as const;
  const diff = dueMs - now;
  if (diff <= 24 * 60 * 60 * 1000) return "soon" as const;
  return "none" as const;
}

