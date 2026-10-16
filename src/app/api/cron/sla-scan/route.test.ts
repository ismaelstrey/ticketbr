import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const guardAdminMock = vi.fn();
const runSlaScanMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  guardAdmin: guardAdminMock
}));

vi.mock("@/server/services/notifications", () => ({
  runSlaScan: runSlaScanMock
}));

describe("/api/cron/sla-scan", () => {
  beforeEach(() => {
    vi.resetModules();
    guardAdminMock.mockReset();
    runSlaScanMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("retorna 403 quando não há segredo válido nem sessão de admin", async () => {
    vi.stubEnv("CRON_SECRET", "segredo");
    guardAdminMock.mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(runSlaScanMock).not.toHaveBeenCalled();
  });

  it("executa a varredura quando o CRON_SECRET é válido", async () => {
    vi.stubEnv("CRON_SECRET", "segredo");
    runSlaScanMock.mockResolvedValue({ scanned: 2, warnings: 1, breached: 1 });

    const { GET } = await import("./route");
    const req = { headers: new Headers({ authorization: "Bearer segredo" }) } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.scanned).toBe(2);
    expect(guardAdminMock).not.toHaveBeenCalled();
  });

  it("executa a varredura para administrador autenticado sem CRON_SECRET", async () => {
    guardAdminMock.mockResolvedValueOnce(null);
    runSlaScanMock.mockResolvedValue({ scanned: 0, warnings: 0, breached: 0 });

    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(runSlaScanMock).toHaveBeenCalledTimes(1);
  });
});
