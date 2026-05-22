import { CustomerSlaSummary } from "@/types/customerDashboard";
import { getPortalStatusCopy } from "@/lib/tickets/portal-status-taxonomy";

type SlaTicket = {
  status: string;
  createdAt: Date | string;
  responseSlaAt?: Date | string | null;
  solutionSlaAt?: Date | string | null;
};

export function priorityLabel(priority: string) {
  if (priority === "HIGH") return "Alta";
  if (priority === "MEDIUM") return "Media";
  return "Normal";
}

export function portalStatusLabel(status: string) {
  return getPortalStatusCopy(status as any)?.label || status;
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function computeCustomerSla(ticket: SlaTicket, now = new Date()): CustomerSlaSummary {
  const createdAt = toDate(ticket.createdAt);
  const solutionSlaAt = toDate(ticket.solutionSlaAt);
  const responseSlaAt = toDate(ticket.responseSlaAt);

  if (ticket.status === "DONE") {
    return {
      state: "DONE",
      label: "Concluido",
      progress: 100,
      responseSlaAt: responseSlaAt?.toISOString() ?? null,
      solutionSlaAt: solutionSlaAt?.toISOString() ?? null
    };
  }

  if (!solutionSlaAt || !createdAt) {
    return {
      state: "NO_SLA",
      label: "Sem SLA",
      progress: null,
      responseSlaAt: responseSlaAt?.toISOString() ?? null,
      solutionSlaAt: solutionSlaAt?.toISOString() ?? null
    };
  }

  const totalMs = Math.max(1, solutionSlaAt.getTime() - createdAt.getTime());
  const elapsedMs = Math.max(0, now.getTime() - createdAt.getTime());
  const progress = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
  const remainingMs = solutionSlaAt.getTime() - now.getTime();

  if (remainingMs < 0) {
    return {
      state: "OVERDUE",
      label: "SLA vencido",
      progress: 100,
      responseSlaAt: responseSlaAt?.toISOString() ?? null,
      solutionSlaAt: solutionSlaAt.toISOString()
    };
  }

  const atRisk = progress >= 80 || remainingMs <= 2 * 60 * 60 * 1000;
  return {
    state: atRisk ? "AT_RISK" : "ON_TRACK",
    label: atRisk ? "SLA em risco" : "Dentro do SLA",
    progress,
    responseSlaAt: responseSlaAt?.toISOString() ?? null,
    solutionSlaAt: solutionSlaAt.toISOString()
  };
}

export function formatDurationHours(hours: number | null) {
  if (hours == null || !Number.isFinite(hours)) return "-";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1).replace(".", ",")} h`;
}
