import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/server/services/audit-log";
import { elapsedMs, RequestContext } from "@/lib/observability";

// Entidade usada no AuditLog para persistir métricas de requisição por rota
const ROUTE_METRIC_ENTITY = "route_metric";

export type RouteMetricOutcome = "success" | "failure";

export type RecordRouteMetricInput = {
  route: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  outcome?: RouteMetricOutcome;
  actorUserId?: string | null;
  solicitanteId?: string | null;
  metadata?: Record<string, unknown>;
};

type RouteMetricMetadata = {
  route: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  outcome: RouteMetricOutcome;
  [key: string]: unknown;
};

/** Classifica o desfecho da requisição a partir do status HTTP. */
function resolveOutcome(statusCode: number): RouteMetricOutcome {
  return statusCode >= 400 ? "failure" : "success";
}

/** Calcula um percentil simples sobre uma lista de latências. */
function percentile(values: number[], ratio: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index] ?? null;
}

/** Valida e normaliza os metadados persistidos de uma métrica de rota. */
function parseMetadata(metadata: unknown): RouteMetricMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;
  const source = metadata as Record<string, unknown>;

  if (
    typeof source.route !== "string" ||
    typeof source.method !== "string" ||
    typeof source.statusCode !== "number" ||
    typeof source.latencyMs !== "number" ||
    (source.outcome !== "success" && source.outcome !== "failure")
  ) {
    return null;
  }

  return {
    route: source.route,
    method: source.method,
    statusCode: source.statusCode,
    latencyMs: source.latencyMs,
    outcome: source.outcome,
    ...source
  };
}

/** Persiste uma métrica de requisição de rota no AuditLog (nunca lança erro). */
export async function recordRouteMetric(input: RecordRouteMetricInput) {
  const outcome = input.outcome ?? resolveOutcome(input.statusCode);
  const safeLatency = Number.isFinite(input.latencyMs) ? Math.max(0, Math.round(input.latencyMs)) : 0;

  await writeAuditLog({
    solicitanteId: input.solicitanteId ?? null,
    actorUserId: input.actorUserId ?? null,
    action: `obs.route.${outcome}`,
    entity: ROUTE_METRIC_ENTITY,
    entityId: null,
    metadata: {
      route: input.route,
      method: input.method,
      statusCode: input.statusCode,
      latencyMs: safeLatency,
      outcome,
      ...(input.metadata ?? {})
    }
  });
}

/**
 * Registra a métrica da rota e devolve a própria resposta HTTP.
 * Útil para encadear diretamente no retorno dos handlers.
 */
export async function trackRouteResponse(
  route: string,
  method: string,
  context: RequestContext,
  response: Response,
  options: { actorUserId?: string | null; solicitanteId?: string | null; metadata?: Record<string, unknown> } = {}
): Promise<Response> {
  await recordRouteMetric({
    route,
    method,
    statusCode: response.status,
    latencyMs: elapsedMs(context),
    actorUserId: options.actorUserId,
    solicitanteId: options.solicitanteId,
    metadata: options.metadata
  });

  return response;
}

/** Agrega as métricas operacionais por rota/método dentro de uma janela. */
export async function getOperationalRouteMetrics(now: Date = new Date(), windowHours = 24) {
  const safeWindowHours = Number.isFinite(windowHours) ? Math.min(Math.max(Math.floor(windowHours), 1), 168) : 24;
  const periodEnd = now;
  const periodStart = new Date(periodEnd.getTime() - safeWindowHours * 60 * 60 * 1000);

  const events = await prisma.auditLog.findMany({
    where: {
      entity: ROUTE_METRIC_ENTITY,
      createdAt: { gte: periodStart, lte: periodEnd },
      action: { startsWith: "obs.route." }
    },
    orderBy: { createdAt: "asc" },
    select: {
      action: true,
      createdAt: true,
      metadata: true
    }
  });

  type RouteAccumulator = {
    route: string;
    method: string;
    total: number;
    success: number;
    failure: number;
    latencies: number[];
    statusCodes: Record<string, number>;
  };

  const routes = new Map<string, RouteAccumulator>();

  for (const event of events) {
    const parsed = parseMetadata(event.metadata);
    if (!parsed) continue;

    const key = `${parsed.method} ${parsed.route}`;
    const accumulator =
      routes.get(key) ??
      {
        route: parsed.route,
        method: parsed.method,
        total: 0,
        success: 0,
        failure: 0,
        latencies: [],
        statusCodes: {}
      };

    accumulator.total += 1;
    accumulator.latencies.push(parsed.latencyMs);
    accumulator.statusCodes[String(parsed.statusCode)] = (accumulator.statusCodes[String(parsed.statusCode)] ?? 0) + 1;

    if (parsed.outcome === "success") {
      accumulator.success += 1;
    } else {
      accumulator.failure += 1;
    }

    routes.set(key, accumulator);
  }

  const routeList = Array.from(routes.values())
    .map((entry) => {
      const avgLatencyMs = entry.latencies.length
        ? Number((entry.latencies.reduce((acc, value) => acc + value, 0) / entry.latencies.length).toFixed(2))
        : null;
      return {
        route: entry.route,
        method: entry.method,
        total: entry.total,
        success: entry.success,
        failure: entry.failure,
        errorRate: entry.total === 0 ? null : Number((entry.failure / entry.total).toFixed(4)),
        avgLatencyMs,
        p95LatencyMs: percentile(entry.latencies, 0.95),
        statusCodes: entry.statusCodes
      };
    })
    .sort((a, b) => b.total - a.total);

  const totals = routeList.reduce(
    (acc, entry) => {
      acc.requests += entry.total;
      acc.success += entry.success;
      acc.failure += entry.failure;
      return acc;
    },
    { requests: 0, success: 0, failure: 0 }
  );

  return {
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString()
    },
    windowHours: safeWindowHours,
    totals: {
      ...totals,
      errorRate: totals.requests === 0 ? null : Number((totals.failure / totals.requests).toFixed(4))
    },
    routes: routeList
  };
}
