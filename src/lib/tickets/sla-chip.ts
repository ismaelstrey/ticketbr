export type SlaChipTone = "safe" | "warning" | "danger" | "breach";
type PriorityInput = "Alta" | "Média" | "Sem prioridade" | "HIGH" | "MEDIUM" | "NONE" | string;

export function getSlaToneFromProgress(progress: number): SlaChipTone {
  if (progress >= 100) return "breach";
  if (progress >= 90) return "danger";
  if (progress >= 70) return "warning";
  return "safe";
}

const SLA_TONE_COLORS: Record<SlaChipTone, string> = {
  safe: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  breach: "#dc2626"
};

/** Cor padronizada para cada tom de SLA, reutilizada por chips e contadores. */
export function getSlaToneColor(tone: SlaChipTone): string {
  return SLA_TONE_COLORS[tone] ?? SLA_TONE_COLORS.safe;
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
