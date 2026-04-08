import { ProjectStatus } from "@/types/project";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  ARCHIVED: "Arquivado"
};

export function normalizeDateInput(value: string | null | undefined) {
  const v = String(value ?? "").trim();
  return v ? v : "";
}

