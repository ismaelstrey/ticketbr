import { describe, expect, it, vi, beforeEach } from "vitest";

const findUniqueSolicitanteMock = vi.fn();
const findManyTicketsMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    solicitante: {
      findUnique: findUniqueSolicitanteMock
    },
    ticket: {
      findMany: findManyTicketsMock
    }
  }
}));

vi.mock("@/server/services/staff-context", () => ({
  // Libera o acesso simulando uma sessão de staff válida
  guardStaff: vi.fn(async () => null)
}));

// Evita persistência real de métricas de rota durante os testes
vi.mock("@/server/services/route-metrics-observability", () => ({
  recordRouteMetric: async () => {},
  trackRouteResponse: async (
    _route: string,
    _method: string,
    _context: unknown,
    response: Response
  ) => response
}));

describe("GET /api/chat/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueSolicitanteMock.mockResolvedValue(null);
    findManyTicketsMock.mockResolvedValue([]);
  });

  it("retorna [] quando não há filtros", async () => {
    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(0);
    expect(findManyTicketsMock).toHaveBeenCalledTimes(0);
  });

  it("quando companyId existe, inclui fallback por nome do solicitante na query", async () => {
    findUniqueSolicitanteMock.mockResolvedValueOnce({
      nome_fantasia: "Tech Sol",
      razao_social: "Tech Sol LTDA"
    });

    findManyTicketsMock.mockResolvedValueOnce([
      {
        id: "t1",
        number: 1,
        subject: "Teste",
        solicitante_id: "s1",
        priority: "HIGH",
        status: "TODO",
        createdAt: new Date("2026-03-20T10:00:00.000Z"),
        foraDeContrato: false,
        slaHorasAplicadas: 24,
        solutionSlaAt: null,
        pausedTotalSeconds: 0,
        pauseSla: false,
        pausedStartedAt: null,
        solicitante: { id: "s1", nome_fantasia: "Tech Sol", razao_social: "Tech Sol LTDA" },
        tipo_ticket: null
      }
    ]);

    const { GET } = await import("./route");
    const params = new URLSearchParams({ companyId: "s1" });
    const req = { nextUrl: { searchParams: params } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(findUniqueSolicitanteMock).toHaveBeenCalledTimes(1);
    expect(findManyTicketsMock).toHaveBeenCalledTimes(1);
    const where = (findManyTicketsMock.mock.calls[0]?.[0] as any)?.where;
    expect(where?.OR?.some((c: any) => c?.solicitante_id === "s1")).toBe(true);
    expect(where?.OR?.some((c: any) => c?.solicitante?.is?.nome_fantasia?.equals === "Tech Sol")).toBe(true);
    expect(where?.OR?.some((c: any) => c?.solicitante?.is?.razao_social?.equals === "Tech Sol LTDA")).toBe(true);

    expect(body.data[0]).toMatchObject({
      id: "t1",
      number: 1,
      subject: "Teste",
      companyId: "s1",
      companyName: "Tech Sol",
      priorityLabel: "Alta"
    });
    expect(typeof body.data[0].slaProgress).toBe("number");
    expect(typeof body.data[0].slaLabel).toBe("string");
  });
});

