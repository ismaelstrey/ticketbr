import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const guardAdminMock = vi.fn();
const captureDailySnapshotMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  guardAdmin: guardAdminMock
}));

vi.mock("@/server/services/kpi-snapshots", () => ({
  captureDailySnapshot: captureDailySnapshotMock
}));

describe("/api/cron/kpi-snapshot", () => {
  beforeEach(() => {
    vi.resetModules();
    guardAdminMock.mockReset();
    captureDailySnapshotMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("retorna 403 quando não há segredo válido nem sessão de admin", async () => {
    vi.stubEnv("CRON_SECRET", "segredo");
    guardAdminMock.mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(captureDailySnapshotMock).not.toHaveBeenCalled();
  });

  it("captura o snapshot quando o CRON_SECRET é válido", async () => {
    vi.stubEnv("CRON_SECRET", "segredo");
    captureDailySnapshotMock.mockResolvedValue({
      snapshotDate: new Date("2026-05-01T00:00:00.000Z"),
      openTotal: 12,
      doneTotal: 5,
      overdueTotal: 2,
      slaWarningTotal: 3
    });

    const { GET } = await import("./route");
    const req = { headers: new Headers({ authorization: "Bearer segredo" }) } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.openTotal).toBe(12);
    expect(guardAdminMock).not.toHaveBeenCalled();
  });

  it("captura o snapshot para administrador autenticado sem CRON_SECRET", async () => {
    guardAdminMock.mockResolvedValueOnce(null);
    captureDailySnapshotMock.mockResolvedValue({
      snapshotDate: new Date("2026-05-01T00:00:00.000Z"),
      openTotal: 0,
      doneTotal: 0,
      overdueTotal: 0,
      slaWarningTotal: 0
    });

    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(captureDailySnapshotMock).toHaveBeenCalledTimes(1);
  });
});
