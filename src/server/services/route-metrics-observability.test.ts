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

describe("route-metrics-observability", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    writeAuditLogMock.mockReset();
  });

  it("registra métrica de rota no audit log com action padronizada", async () => {
    const { recordRouteMetric } = await import("./route-metrics-observability");

    await recordRouteMetric({
      route: "/api/tickets",
      method: "GET",
      statusCode: 200,
      latencyMs: 42.7,
      actorUserId: "u1"
    });

    expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "obs.route.success",
        entity: "route_metric",
        actorUserId: "u1",
        metadata: expect.objectContaining({
          route: "/api/tickets",
          method: "GET",
          statusCode: 200,
          latencyMs: 43,
          outcome: "success"
        })
      })
    );
  });

  it("classifica status >= 400 como failure", async () => {
    const { recordRouteMetric } = await import("./route-metrics-observability");

    await recordRouteMetric({
      route: "/api/tickets",
      method: "POST",
      statusCode: 500,
      latencyMs: 10
    });

    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "obs.route.failure",
        metadata: expect.objectContaining({ outcome: "failure", statusCode: 500 })
      })
    );
  });

  it("trackRouteResponse devolve a própria resposta e registra a métrica", async () => {
    const { trackRouteResponse } = await import("./route-metrics-observability");
    const { createRequestContext } = await import("@/lib/observability");

    const context = createRequestContext();
    const response = new Response(JSON.stringify({ ok: true }), { status: 201 });

    const result = await trackRouteResponse("/api/tickets", "POST", context, response, {
      actorUserId: "u1",
      solicitanteId: "s1"
    });

    expect(result).toBe(response);
    expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "obs.route.success",
        entity: "route_metric",
        solicitanteId: "s1",
        actorUserId: "u1",
        metadata: expect.objectContaining({ route: "/api/tickets", method: "POST", statusCode: 201 })
      })
    );
  });

  it("agrega métricas por rota/método com latência, p95 e taxa de erro", async () => {
    findManyMock.mockResolvedValueOnce([
      { action: "obs.route.success", createdAt: new Date("2026-04-10T10:00:00.000Z"), metadata: { route: "/api/tickets", method: "GET", statusCode: 200, latencyMs: 100, outcome: "success" } },
      { action: "obs.route.success", createdAt: new Date("2026-04-10T10:01:00.000Z"), metadata: { route: "/api/tickets", method: "GET", statusCode: 200, latencyMs: 300, outcome: "success" } },
      { action: "obs.route.failure", createdAt: new Date("2026-04-10T10:02:00.000Z"), metadata: { route: "/api/tickets", method: "GET", statusCode: 500, latencyMs: 200, outcome: "failure" } },
      { action: "obs.route.success", createdAt: new Date("2026-04-10T10:03:00.000Z"), metadata: { route: "/api/customer/tickets", method: "POST", statusCode: 201, latencyMs: 50, outcome: "success" } },
      { action: "obs.route.success", createdAt: new Date("2026-04-10T10:04:00.000Z"), metadata: { invalid: true } }
    ]);

    const { getOperationalRouteMetrics } = await import("./route-metrics-observability");
    const result = await getOperationalRouteMetrics(new Date("2026-04-10T12:00:00.000Z"), 24);

    expect(result.windowHours).toBe(24);
    expect(result.totals.requests).toBe(4);
    expect(result.totals.success).toBe(3);
    expect(result.totals.failure).toBe(1);
    expect(result.totals.errorRate).toBe(0.25);
    expect(result.routes).toHaveLength(2);

    const ticketsRoute = result.routes.find((entry) => entry.route === "/api/tickets");
    expect(ticketsRoute).toBeDefined();
    expect(ticketsRoute?.total).toBe(3);
    expect(ticketsRoute?.success).toBe(2);
    expect(ticketsRoute?.failure).toBe(1);
    expect(ticketsRoute?.avgLatencyMs).toBe(200);
    expect(ticketsRoute?.p95LatencyMs).toBe(300);
    expect(ticketsRoute?.statusCodes).toEqual({ "200": 2, "500": 1 });
  });

  it("retorna totais zerados quando não há eventos", async () => {
    findManyMock.mockResolvedValueOnce([]);

    const { getOperationalRouteMetrics } = await import("./route-metrics-observability");
    const result = await getOperationalRouteMetrics(new Date("2026-04-10T12:00:00.000Z"));

    expect(result.windowHours).toBe(24);
    expect(result.totals.requests).toBe(0);
    expect(result.totals.errorRate).toBeNull();
    expect(result.routes).toHaveLength(0);
  });
});
