import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/server/services/audit-log";

export type CriticalFlowStage = "chat_inbound" | "chat_attendance" | "customer_update";
export type CriticalFlowOutcome = "success" | "failure";

type RecordCriticalFlowEventInput = {
  stage: CriticalFlowStage;
  outcome: CriticalFlowOutcome;
  action: string;
  latencyMs: number;
  statusCode?: number;
  actorUserId?: string | null;
  solicitanteId?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

type CriticalFlowLogMetadata = {
  stage: CriticalFlowStage;
  outcome: CriticalFlowOutcome;
  action: string;
  latencyMs: number;
  statusCode?: number;
  [key: string]: unknown;
};

function toNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

function percentile(values: number[], ratio: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index] ?? null;
}

function parseMetadata(metadata: unknown): CriticalFlowLogMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;
  const source = metadata as Record<string, unknown>;
  const stage = source.stage;
  const outcome = source.outcome;
  const action = source.action;
  const latencyMs = source.latencyMs;

  if (
    (stage !== "chat_inbound" && stage !== "chat_attendance" && stage !== "customer_update") ||
    (outcome !== "success" && outcome !== "failure") ||
    typeof action !== "string" ||
    typeof latencyMs !== "number"
  ) {
    return null;
  }

  return {
    stage,
    outcome,
    action,
    latencyMs,
    statusCode: toNumber(source.statusCode) ?? undefined,
    ...source
  };
}

export async function recordCriticalFlowEvent(input: RecordCriticalFlowEventInput) {
  const safeLatency = Number.isFinite(input.latencyMs) ? Math.max(0, Math.round(input.latencyMs)) : 0;
  await writeAuditLog({
    solicitanteId: input.solicitanteId ?? null,
    actorUserId: input.actorUserId ?? null,
    action: `obs.${input.stage}.${input.outcome}`,
    entity: "critical_flow",
    entityId: input.entityId ?? null,
    metadata: {
      stage: input.stage,
      outcome: input.outcome,
      action: input.action,
      latencyMs: safeLatency,
      statusCode: input.statusCode,
      ...(input.metadata ?? {})
    }
  });
}

export async function getWeeklyCriticalFlowKpis(now: Date = new Date()) {
  const periodEnd = now;
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const events = await prisma.auditLog.findMany({
    where: {
      entity: "critical_flow",
      createdAt: { gte: periodStart, lte: periodEnd },
      action: { startsWith: "obs." }
    },
    orderBy: { createdAt: "asc" },
    select: {
      action: true,
      createdAt: true,
      metadata: true
    }
  });

  const stages: Record<
    CriticalFlowStage,
    {
      total: number;
      success: number;
      failure: number;
      latencies: number[];
      successLatencies: number[];
      actions: Record<string, number>;
    }
  > = {
    chat_inbound: { total: 0, success: 0, failure: 0, latencies: [], successLatencies: [], actions: {} },
    chat_attendance: { total: 0, success: 0, failure: 0, latencies: [], successLatencies: [], actions: {} },
    customer_update: { total: 0, success: 0, failure: 0, latencies: [], successLatencies: [], actions: {} }
  };

  for (const event of events) {
    const parsed = parseMetadata(event.metadata);
    if (!parsed) continue;

    const stage = stages[parsed.stage];
    stage.total += 1;
    stage.actions[parsed.action] = (stage.actions[parsed.action] ?? 0) + 1;

    if (parsed.outcome === "success") {
      stage.success += 1;
      stage.successLatencies.push(parsed.latencyMs);
    } else {
      stage.failure += 1;
    }

    stage.latencies.push(parsed.latencyMs);
  }

  const summaryByStage = {
    chatInbound: stages.chat_inbound,
    chatAttendance: stages.chat_attendance,
    customerUpdate: stages.customer_update
  };

  return {
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString()
    },
    totals: {
      events: events.length,
      success: stages.chat_inbound.success + stages.chat_attendance.success + stages.customer_update.success,
      failure: stages.chat_inbound.failure + stages.chat_attendance.failure + stages.customer_update.failure
    },
    stages: Object.fromEntries(
      Object.entries(summaryByStage).map(([key, value]) => {
        const successRate = value.total === 0 ? null : Number((value.success / value.total).toFixed(4));
        return [
          key,
          {
            total: value.total,
            success: value.success,
            failure: value.failure,
            successRate,
            p95LatencyMs: percentile(value.latencies, 0.95),
            p95SuccessLatencyMs: percentile(value.successLatencies, 0.95),
            actions: value.actions
          }
        ];
      })
    )
  };
}
