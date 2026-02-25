export function getSlaTone(progress: number): "ok" | "warning" | "danger" | "breach" {
  if (progress >= 100) return "breach";
  if (progress >= 85) return "danger";
  if (progress >= 70) return "warning";
  return "ok";
}

export function getSlaLabel(progress: number): string {
  const tone = getSlaTone(progress);
  if (tone === "breach") return "SLA rompido";
  if (tone === "danger") return "SLA crítico";
  if (tone === "warning") return "SLA em atenção";
  return "SLA dentro do prazo";
}

export function getSlaColor(progress: number): string {
  const tone = getSlaTone(progress);
  if (tone === "breach") return "#dc2626";
  if (tone === "danger") return "#ef4444";
  if (tone === "warning") return "#f59e0b";
  return "#22c55e";
}
