import { prisma } from "@/lib/prisma";
import { computeCustomerSla, portalStatusLabel } from "@/lib/customerPortal";
import { CustomerDashboardFilters, CustomerDashboardResponse, CustomerSlaState } from "@/types/customerDashboard";

type WindowRange = { from: Date; to: Date };

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function computeWindow(filters: CustomerDashboardFilters): WindowRange {
  const now = new Date();
  const preset = filters.preset ?? "7d";

  if (preset === "today") {
    return { from: startOfDay(now), to: now };
  }

  if (preset === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from, to: now };
  }

  if (preset === "custom" && filters.from && filters.to) {
    const from = new Date(filters.from);
    const to = new Date(filters.to);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return to < from ? { from: to, to: from } : { from, to };
    }
  }

  const from = new Date(now);
  from.setDate(from.getDate() - 7);
  return { from, to: now };
}

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function averageHours(values: number[]) {
  if (!values.length) return null;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Number(avg.toFixed(2));
}

function increment(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) || 0) + by);
}

function buildSearchFilter(q: string) {
  if (!q) return {};
  return {
    OR: [
      { subject: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } }
    ]
  };
}

export async function getCustomerTicketsDashboard(
  solicitanteId: string,
  filters: CustomerDashboardFilters
): Promise<CustomerDashboardResponse> {
  const window = computeWindow(filters);
  const now = new Date();
  const q = String(filters.q ?? "").trim();

  const baseWhere = {
    solicitante_id: solicitanteId,
    deleted_at: null,
    ...(filters.status ? { status: filters.status as any } : {}),
    ...(filters.priority ? { priority: filters.priority as any } : {}),
    ...(filters.categoryId ? { categoria_id: String(filters.categoryId) } : {}),
    ...buildSearchFilter(q)
  };

  const tickets = await prisma.ticket.findMany({
    where: baseWhere,
    orderBy: { updatedAt: "desc" },
    include: {
      categoria: { select: { nome: true } },
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          type: true,
          toStatus: true,
          authorId: true,
          createdAt: true
        }
      }
    }
  });

  const inRange = tickets.filter((ticket) => ticket.createdAt >= window.from && ticket.createdAt <= window.to);
  const openTickets = tickets.filter((ticket) => ticket.status !== "DONE");
  const doneInRange = tickets.filter((ticket) => {
    const doneAt = ticket.events.find((event) => event.toStatus === "DONE")?.createdAt;
    return doneAt ? doneAt >= window.from && doneAt <= window.to : ticket.status === "DONE" && ticket.updatedAt >= window.from && ticket.updatedAt <= window.to;
  });

  const volume = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const slaCounts = new Map<CustomerSlaState, number>();

  inRange.forEach((ticket) => {
    increment(volume, dayKey(ticket.createdAt));
    increment(statusCounts, String(ticket.status));
    increment(categoryCounts, ticket.categoria?.nome || ticket.category || "Sem categoria");
  });

  tickets.forEach((ticket) => {
    increment(slaCounts, computeCustomerSla(ticket, now).state);
  });

  const resolutionHours = doneInRange
    .map((ticket) => {
      const doneAt = ticket.events.find((event) => event.toStatus === "DONE")?.createdAt ?? ticket.updatedAt;
      const hours = (doneAt.getTime() - ticket.createdAt.getTime()) / 36e5;
      return Number.isFinite(hours) && hours >= 0 ? hours : null;
    })
    .filter((value): value is number => value != null);

  const firstResponseHours = tickets
    .map((ticket) => {
      const firstResponse = ticket.events.find((event) => event.type === "COMMENT" && event.authorId && event.authorId !== ticket.createdByUserId);
      if (!firstResponse) return null;
      const hours = (firstResponse.createdAt.getTime() - ticket.createdAt.getTime()) / 36e5;
      return Number.isFinite(hours) && hours >= 0 ? hours : null;
    })
    .filter((value): value is number => value != null);

  const criticalTickets = openTickets
    .map((ticket) => ({
      ticket,
      sla: computeCustomerSla(ticket, now)
    }))
    .filter((item) => item.sla.state === "OVERDUE" || item.sla.state === "AT_RISK" || item.ticket.priority === "HIGH")
    .sort((a, b) => {
      const aTime = a.ticket.solutionSlaAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.ticket.solutionSlaAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime || b.ticket.updatedAt.getTime() - a.ticket.updatedAt.getTime();
    })
    .slice(0, 12);

  const slaLabels: Record<CustomerSlaState, string> = {
    ON_TRACK: "Dentro do SLA",
    AT_RISK: "Em risco",
    OVERDUE: "Vencido",
    DONE: "Concluido",
    NO_SLA: "Sem SLA"
  };

  return {
    data: {
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      generatedAt: now.toISOString(),
      kpis: {
        openTotal: openTickets.length,
        inProgress: tickets.filter((ticket) => ticket.status === "DOING").length,
        doneInRange: doneInRange.length,
        overdue: tickets.filter((ticket) => computeCustomerSla(ticket, now).state === "OVERDUE").length,
        atRisk: tickets.filter((ticket) => computeCustomerSla(ticket, now).state === "AT_RISK").length,
        avgResolutionHours: averageHours(resolutionHours),
        avgFirstResponseHours: averageHours(firstResponseHours)
      },
      charts: {
        volume: Array.from(volume.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([x, y]) => ({ x, y })),
        statusDonut: Array.from(statusCounts.entries()).map(([status, count]) => ({
          status,
          label: portalStatusLabel(status),
          count
        })),
        categoryBar: Array.from(categoryCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([category, count]) => ({ category, count })),
        slaDonut: Array.from(slaCounts.entries()).map(([state, count]) => ({
          state,
          label: slaLabels[state],
          count
        }))
      },
      tables: {
        criticalTickets: criticalTickets.map(({ ticket, sla }) => ({
          id: ticket.id,
          number: ticket.number,
          subject: ticket.subject,
          status: String(ticket.status),
          priority: String(ticket.priority),
          category: ticket.categoria?.nome || ticket.category || "Sem categoria",
          sla,
          updatedAt: ticket.updatedAt.toISOString()
        }))
      }
    }
  };
}
