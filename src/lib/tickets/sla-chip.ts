export type SlaChipTone = "safe" | "warning" | "danger" | "breach";
type PriorityInput = "Alta" | "Média" | "Sem prioridade" | "HIGH" | "MEDIUM" | "NONE" | string;

export function getSlaToneFromProgress(progress: number): SlaChipTone {
  if (progress >= 100) return "breach";
  if (progress >= 90) return "danger";
  if (progress >= 70) return "warning";
  return "safe";
}

export function getSlaChipLabel(tone: SlaChipTone): string {
  if (tone === "breach") return "SLA rompido";
  if (tone === "danger") return "SLA crítico";
  if (tone === "warning") return "SLA em atenção";
  return "SLA dentro do prazo";
}

export function getPriorityChipLabel(priority: PriorityInput): string {
  if (priority === "Alta" || priority === "HIGH") return "Prioridade alta";
  if (priority === "Média" || priority === "MEDIUM") return "Prioridade média";
  return "Sem prioridade";
}
