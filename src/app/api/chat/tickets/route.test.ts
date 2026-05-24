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
        company: "Tech Sol",
        solicitante_id: null,
        solicitante: null
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
    expect(where?.OR?.some((c: any) => c?.company?.equals === "Tech Sol")).toBe(true);
    expect(where?.OR?.some((c: any) => c?.company?.equals === "Tech Sol LTDA")).toBe(true);

    expect(body.data[0]).toEqual({
      id: "t1",
      number: 1,
      subject: "Teste",
      companyId: null,
      companyName: "Tech Sol"
    });
  });
});

