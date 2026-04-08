import { prisma } from "@/lib/prisma";
import { TicketOperationalDashboardResponse, TicketDashboardFilters } from "@/types/ticketsDashboard";

type WindowRange = { from: Date; to: Date; prevFrom: Date; prevTo: Date };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function clampDateRange(from: Date, to: Date) {
  const f = new Date(from);
  const t = new Date(to);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) {
    const now = new Date();
    const seven = new Date(now);
    seven.setDate(seven.getDate() - 7);
    return { from: seven, to: now };
  }
  if (t < f) return { from: t, to: f };
  return { from: f, to: t };
}

function computeWindow(filters: TicketDashboardFilters): WindowRange {
  const now = new Date();
  const preset = filters.preset ?? "7d";
  if (preset === "today") {
    const from = startOfDay(now);
    const to = now;
    const prevTo = new Date(from);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - 1);
    return { from, to, prevFrom, prevTo };
  }

  if (preset === "30d") {
    const to = now;
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    const prevTo = new Date(from);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - 30);
    return { from, to, prevFrom, prevTo };
  }

  if (preset === "custom" && filters.from && filters.to) {
    const { from, to } = clampDateRange(new Date(filters.from), new Date(filters.to));
    const ms = Math.max(1, to.getTime() - from.getTime());
    const prevTo = new Date(from.getTime());
    const prevFrom = new Date(from.getTime() - ms);
    return { from, to, prevFrom, prevTo };
  }

  const to = now;
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  const prevTo = new Date(from);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - 7);
  return { from, to, prevFrom, prevTo };
}

function baseTicketWhere(filters: TicketDashboardFilters) {
  const q = String(filters.q ?? "").trim();
  return {
    deleted_at: null,
    ...(filters.status ? { status: filters.status as any } : {}),
    ...(filters.priority ? { priority: filters.priority as any } : {}),
    ...(filters.agentId ? { operatorId: String(filters.agentId) } : {}),
    ...(filters.clientId ? { solicitante_id: String(filters.clientId) } : {}),
    ...(filters.categoryId ? { categoria_id: String(filters.categoryId) } : {}),
    ...(q
      ? {
          OR: [
            { subject: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } }
          ]
        }
      : {})
  };
}

function iso(d: Date) {
  return d.toISOString();
}

function buildSqlFilter(filters: TicketDashboardFilters) {
  const parts: string[] = ["t.deleted_at IS NULL"]; 
  const params: any[] = [];
  const push = (clause: string, value: any) => {
    params.push(value);
    parts.push(clause.replace("$", `$${params.length}`));
  };

  if (filters.status) push('t."status" = $', String(filters.status));
  if (filters.priority) push('t."priority" = $', String(filters.priority));
  if (filters.agentId) push('t."operatorId" = $', String(filters.agentId));
  if (filters.clientId) push('t."solicitante_id" = $', String(filters.clientId));
  if (filters.categoryId) push('t."categoria_id" = $', String(filters.categoryId));
  const q = String(filters.q ?? "").trim();
  if (q) {
    params.push(`%${q}%`);
    const n = params.length;
    parts.push(`(t.subject ILIKE $${n} OR COALESCE(t.description,'') ILIKE $${n})`);
  }
  return { sql: parts.join(" AND "), params };
}

export async function getTicketsOperationalDashboard(filters: TicketDashboardFilters): Promise<TicketOperationalDashboardResponse> {
  const window = computeWindow(filters);
  const now = new Date();

  const baseWhere = baseTicketWhere(filters);
  const rangeWhere = { ...baseWhere, createdAt: { gte: window.from, lte: window.to } };
  const prevRangeWhere = { ...baseWhere, createdAt: { gte: window.prevFrom, lte: window.prevTo } };

  const [openTotal, openedInRange, openedInPrevRange, overdue] = await Promise.all([
    prisma.ticket.count({ where: { ...baseWhere, status: { not: "DONE" as any } } }),
    prisma.ticket.count({ where: rangeWhere }),
    prisma.ticket.count({ where: prevRangeWhere }),
    prisma.ticket.count({
      where: {
        ...baseWhere,
        status: { not: "DONE" as any },
        solutionSlaAt: { lt: now }
      }
    })
  ]);

  const openDeltaPct = openedInPrevRange > 0 ? ((openedInRange - openedInPrevRange) / openedInPrevRange) * 100 : null;

  const inProgressRows = await prisma.ticket.groupBy({
    by: ["status"],
    where: { ...baseWhere, status: { in: ["TODO", "DOING", "PAUSED"] as any } },
    _count: { _all: true }
  });
  const inProgressByStatus: Record<string, number> = {};
  for (const row of inProgressRows) {
    inProgressByStatus[String(row.status)] = row._count._all;
  }

  const statusDonutRows = await prisma.ticket.groupBy({
    by: ["status"],
    where: rangeWhere,
    _count: { _all: true }
  });
  const statusDonut = statusDonutRows
    .map((r) => ({ status: String(r.status), count: r._count._all }))
    .sort((a, b) => b.count - a.count);

  const sqlBase = buildSqlFilter(filters);
  const volumeGranularity = (window.to.getTime() - window.from.getTime()) / (1000 * 60 * 60 * 24) <= 2 ? "hour" : "day";
  const volumeSql = `
    SELECT date_trunc('${volumeGranularity}', t."createdAt") AS bucket, COUNT(*)::int AS count
    FROM "Ticket" t
    WHERE ${sqlBase.sql} AND t."createdAt" >= $${sqlBase.params.length + 1} AND t."createdAt" <= $${sqlBase.params.length + 2}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;
  const volumeRows = await prisma.$queryRawUnsafe<any[]>(volumeSql, ...sqlBase.params, window.from, window.to);

  const topClientsSql = `
    SELECT COALESCE(t."solicitante_id", NULL) AS "clientId",
           COALESCE(s.nome_fantasia, s.razao_social, t.company, 'Sem cliente') AS "clientName",
           COUNT(*)::int AS count
    FROM "Ticket" t
    LEFT JOIN "Solicitante" s ON s.id = t."solicitante_id"
    WHERE ${sqlBase.sql} AND t."createdAt" >= $${sqlBase.params.length + 1} AND t."createdAt" <= $${sqlBase.params.length + 2}
    GROUP BY "clientId", "clientName"
    ORDER BY count DESC
    LIMIT 10
  `;
  const topClientsRows = await prisma.$queryRawUnsafe<any[]>(topClientsSql, ...sqlBase.params, window.from, window.to);

  const categoryTrendSql = `
    SELECT date_trunc('${volumeGranularity}', t."createdAt") AS bucket,
           COALESCE(c.nome, t.category, 'Sem categoria') AS category,
           COUNT(*)::int AS count
    FROM "Ticket" t
    LEFT JOIN "Categoria_Ticket" c ON c.id = t."categoria_id"
    WHERE ${sqlBase.sql} AND t."createdAt" >= $${sqlBase.params.length + 1} AND t."createdAt" <= $${sqlBase.params.length + 2}
    GROUP BY bucket, category
    ORDER BY bucket ASC
  `;
  const categoryTrendRows = await prisma.$queryRawUnsafe<any[]>(categoryTrendSql, ...sqlBase.params, window.from, window.to);

  const heatmapSql = `
    SELECT EXTRACT(DOW FROM t."createdAt")::int AS dow,
           EXTRACT(HOUR FROM t."createdAt")::int AS hour,
           COUNT(*)::int AS count
    FROM "Ticket" t
    WHERE ${sqlBase.sql} AND t."createdAt" >= $${sqlBase.params.length + 1} AND t."createdAt" <= $${sqlBase.params.length + 2}
    GROUP BY dow, hour
    ORDER BY dow ASC, hour ASC
  `;
  const heatmapRows = await prisma.$queryRawUnsafe<any[]>(heatmapSql, ...sqlBase.params, window.from, window.to);

  const resolvedSql = `
    WITH done_events AS (
      SELECT t.id AS ticket_id,
             t."createdAt" AS created_at,
             MIN(e."createdAt") AS done_at,
             t."operatorId" AS operator_id
      FROM "Ticket" t
      JOIN "TicketEvent" e ON e."ticketId" = t.id
      WHERE ${sqlBase.sql} AND e."toStatus" = 'DONE'
      GROUP BY t.id, t."createdAt", t."operatorId"
    ), comment_counts AS (
      SELECT e."ticketId" AS ticket_id,
             COUNT(*)::int AS comments
      FROM "TicketEvent" e
      WHERE e."type" = 'COMMENT'
      GROUP BY e."ticketId"
    )
    SELECT d.ticket_id,
           d.created_at,
           d.done_at,
           d.operator_id,
           COALESCE(c.comments, 0)::int AS comments
    FROM done_events d
    LEFT JOIN comment_counts c ON c.ticket_id = d.ticket_id
    WHERE d.done_at >= $${sqlBase.params.length + 1} AND d.done_at <= $${sqlBase.params.length + 2}
  `;
  const resolvedRows = await prisma.$queryRawUnsafe<any[]>(resolvedSql, ...sqlBase.params, window.from, window.to);

  const avgResolutionHours = (() => {
    if (!resolvedRows.length) return null;
    const secs = resolvedRows
      .map((r) => {
        const doneAt = new Date(r.done_at);
        const createdAt = new Date(r.created_at);
        const s = (doneAt.getTime() - createdAt.getTime()) / 1000;
        return Number.isFinite(s) && s >= 0 ? s : null;
      })
      .filter((v) => v != null) as number[];
    if (!secs.length) return null;
    return (secs.reduce((a, b) => a + b, 0) / secs.length) / 3600;
  })();

  const fcrRate = (() => {
    if (!resolvedRows.length) return null;
    const ok = resolvedRows.filter((r) => Number(r.comments || 0) <= 1).length;
    return ok / resolvedRows.length;
  })();

  const topAgentsSql = `
    WITH done_events AS (
      SELECT t.id AS ticket_id,
             t."createdAt" AS created_at,
             MIN(e."createdAt") AS done_at,
             t."operatorId" AS operator_id
      FROM "Ticket" t
      JOIN "TicketEvent" e ON e."ticketId" = t.id
      WHERE ${sqlBase.sql} AND e."toStatus" = 'DONE' AND t."operatorId" IS NOT NULL
      GROUP BY t.id, t."createdAt", t."operatorId"
    )
    SELECT u.id AS "agentId",
           u.name AS "agentName",
           COUNT(*)::int AS resolved,
           AVG(EXTRACT(EPOCH FROM (d.done_at - d.created_at))) AS avg_seconds
    FROM done_events d
    JOIN "User" u ON u.id = d.operator_id
    WHERE d.done_at >= $${sqlBase.params.length + 1} AND d.done_at <= $${sqlBase.params.length + 2}
    GROUP BY u.id, u.name
    ORDER BY resolved DESC, avg_seconds ASC
    LIMIT 10
  `;
  const topAgentsRows = await prisma.$queryRawUnsafe<any[]>(topAgentsSql, ...sqlBase.params, window.from, window.to);

  const topCategoriesSql = `
    SELECT COALESCE(c.nome, t.category, 'Sem categoria') AS category,
           COUNT(*)::int AS count
    FROM "Ticket" t
    LEFT JOIN "Categoria_Ticket" c ON c.id = t."categoria_id"
    WHERE ${sqlBase.sql} AND t."createdAt" >= $${sqlBase.params.length + 1} AND t."createdAt" <= $${sqlBase.params.length + 2}
    GROUP BY category
    ORDER BY count DESC
    LIMIT 10
  `;
  const topCategoriesRows = await prisma.$queryRawUnsafe<any[]>(topCategoriesSql, ...sqlBase.params, window.from, window.to);

  const criticalTickets = await prisma.ticket.findMany({
    where: {
      ...baseWhere,
      status: { not: "DONE" as any },
      OR: [
        { solutionSlaAt: { lt: now } },
        { solutionSlaAt: { gte: now, lte: new Date(now.getTime() + 2 * 60 * 60 * 1000) } },
        { priority: "HIGH" as any }
      ]
    },
    orderBy: [{ solutionSlaAt: "asc" }, { updatedAt: "desc" }],
    take: 20,
    include: {
      solicitante: { select: { nome_fantasia: true, razao_social: true } },
      operatorUser: { select: { name: true } }
    }
  });

  return {
    data: {
      window: { from: iso(window.from), to: iso(window.to) },
      generatedAt: iso(new Date()),
      kpis: {
        openTotal,
        openDeltaPct: openDeltaPct == null ? null : Number(openDeltaPct.toFixed(1)),
        inProgressByStatus,
        overdue,
        avgResolutionHours: avgResolutionHours == null ? null : Number(avgResolutionHours.toFixed(2)),
        firstContactResolutionRate: fcrRate == null ? null : Number(fcrRate.toFixed(3))
      },
      charts: {
        statusDonut,
        topClients: topClientsRows.map((r) => ({ clientId: r.clientId ? String(r.clientId) : null, clientName: String(r.clientName), count: Number(r.count) })),
        volume: volumeRows.map((r) => ({ x: new Date(r.bucket).toISOString(), y: Number(r.count) })),
        categoryTrend: categoryTrendRows.map((r) => ({ x: new Date(r.bucket).toISOString(), category: String(r.category), count: Number(r.count) })),
        heatmap: heatmapRows.map((r) => ({ dow: Number(r.dow), hour: Number(r.hour), count: Number(r.count) }))
      },
      tables: {
        criticalTickets: criticalTickets.map((t) => ({
          id: t.id,
          number: t.number,
          subject: t.subject,
          status: String(t.status),
          priority: String(t.priority),
          clientName: t.solicitante?.nome_fantasia || t.solicitante?.razao_social || t.company || "Sem cliente",
          assigneeName: t.operatorUser?.name || t.operator || "",
          responseSlaAt: t.responseSlaAt ? t.responseSlaAt.toISOString() : null,
          solutionSlaAt: t.solutionSlaAt ? t.solutionSlaAt.toISOString() : null,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString()
        })),
        topAgents: topAgentsRows.map((r) => ({
          agentId: String(r.agentId),
          agentName: String(r.agentName),
          resolved: Number(r.resolved),
          avgResolutionHours: r.avg_seconds == null ? null : Number((Number(r.avg_seconds) / 3600).toFixed(2))
        })),
        topCategories: topCategoriesRows.map((r) => ({ category: String(r.category), count: Number(r.count) }))
      }
    }
  };
}

