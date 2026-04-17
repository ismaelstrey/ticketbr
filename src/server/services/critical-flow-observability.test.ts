import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const writeAuditLogMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      findMany: findManyMock
    }
  }
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock
}));

describe("critical-flow-observability", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    writeAuditLogMock.mockReset();
  });

  it("registra evento no audit log com action padronizada", async () => {
    const { recordCriticalFlowEvent } = await import("./critical-flow-observability");

    await recordCriticalFlowEvent({
      stage: "chat_inbound",
      outcome: "success",
      action: "message",
      latencyMs: 42,
      statusCode: 200,
      metadata: { source: "uazapi" }
    });

    expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "obs.chat_inbound.success",
        entity: "critical_flow",
        metadata: expect.objectContaining({
          stage: "chat_inbound",
          outcome: "success",
          action: "message",
          latencyMs: 42,
          source: "uazapi"
        })
      })
    );
  });

  it("agrega KPI semanal por estagio com taxa de sucesso", async () => {
    findManyMock.mockResolvedValueOnce([
      {
        action: "obs.chat_inbound.success",
        createdAt: new Date("2026-04-10T10:00:00.000Z"),
        metadata: { stage: "chat_inbound", outcome: "success", action: "message", latencyMs: 120 }
      },
      {
        action: "obs.chat_inbound.failure",
        createdAt: new Date("2026-04-10T11:00:00.000Z"),
        metadata: { stage: "chat_inbound", outcome: "failure", action: "exception", latencyMs: 300 }
      },
      {
        action: "obs.customer_update.success",
        createdAt: new Date("2026-04-11T09:00:00.000Z"),
        metadata: { stage: "customer_update", outcome: "success", action: "ticket_created", latencyMs: 80 }
      }
    ]);

    const { getWeeklyCriticalFlowKpis } = await import("./critical-flow-observability");
    const result = await getWeeklyCriticalFlowKpis(new Date("2026-04-17T12:00:00.000Z"));

    expect(result.totals.events).toBe(3);
    expect(result.totals.success).toBe(2);
    expect(result.totals.failure).toBe(1);
    expect(result.stages.chatInbound.total).toBe(2);
    expect(result.stages.chatInbound.success).toBe(1);
    expect(result.stages.chatInbound.failure).toBe(1);
    expect(result.stages.chatInbound.successRate).toBe(0.5);
    expect(result.stages.chatInbound.actions.message).toBe(1);
    expect(result.stages.customerUpdate.actions.ticket_created).toBe(1);
    expect(result.stages.chatAttendance.total).toBe(0);
  });
});
