import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const guardAdminMock = vi.fn();
const expirarContratosVencidosMock = vi.fn();
const notifyContractExpiredMock = vi.fn();
const runContractExpiryScanMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  guardAdmin: guardAdminMock
}));

vi.mock("@/server/services/contract-service", () => ({
  expirarContratosVencidos: expirarContratosVencidosMock
}));

vi.mock("@/server/services/notifications", () => ({
  notifyContractExpired: notifyContractExpiredMock,
  runContractExpiryScan: runContractExpiryScanMock
}));

describe("/api/cron/contract-scan", () => {
  beforeEach(() => {
    vi.resetModules();
    guardAdminMock.mockReset();
    expirarContratosVencidosMock.mockReset();
    notifyContractExpiredMock.mockReset();
    runContractExpiryScanMock.mockReset();
    vi.unstubAllEnvs();

    expirarContratosVencidosMock.mockResolvedValue({ expirados: [], renovados: [], solicitantesAfetados: 0 });
    notifyContractExpiredMock.mockResolvedValue({ created: 0, emailed: 0 });
    runContractExpiryScanMock.mockResolvedValue({ scanned: 0, avisos: 0 });
  });

  it("retorna 403 quando não há segredo válido nem sessão de admin", async () => {
    vi.stubEnv("CRON_SECRET", "segredo");
    guardAdminMock.mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(expirarContratosVencidosMock).not.toHaveBeenCalled();
  });

  it("expira, notifica e varre vencimentos quando o CRON_SECRET é válido", async () => {
    vi.stubEnv("CRON_SECRET", "segredo");
    const contrato = {
      id: "c1",
      numero: "CT-001",
      titulo: "Suporte",
      solicitante_id: "s1",
      solicitanteNome: "ACME"
    };
    expirarContratosVencidosMock.mockResolvedValue({
      expirados: [contrato],
      renovados: ["CT-000-R1"],
      solicitantesAfetados: 1
    });
    runContractExpiryScanMock.mockResolvedValue({ scanned: 3, avisos: 2 });

    const { GET } = await import("./route");
    const req = { headers: new Headers({ authorization: "Bearer segredo" }) } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.avisos).toBe(2);
    expect(body.data.renovados).toEqual(["CT-000-R1"]);
    expect(notifyContractExpiredMock).toHaveBeenCalledTimes(1);
    expect(notifyContractExpiredMock.mock.calls[0][0]).toEqual({ contrato });
    expect(runContractExpiryScanMock).toHaveBeenCalledTimes(1);
    expect(guardAdminMock).not.toHaveBeenCalled();
  });

  it("executa a varredura para administrador autenticado sem CRON_SECRET", async () => {
    guardAdminMock.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(expirarContratosVencidosMock).toHaveBeenCalledTimes(1);
    expect(runContractExpiryScanMock).toHaveBeenCalledTimes(1);
  });
});
