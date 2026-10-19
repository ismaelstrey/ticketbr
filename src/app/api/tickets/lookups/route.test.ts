import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  guardStaffMock,
  tipoFindManyMock,
  categoriaFindManyMock,
  mesaFindManyMock,
  operadorFindManyMock
} = vi.hoisted(() => ({
  guardStaffMock: vi.fn(),
  tipoFindManyMock: vi.fn(),
  categoriaFindManyMock: vi.fn(),
  mesaFindManyMock: vi.fn(),
  operadorFindManyMock: vi.fn()
}));

vi.mock("@/server/services/staff-context", () => ({
  guardStaff: guardStaffMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tipo_Ticket: { findMany: tipoFindManyMock },
    categoria_Ticket: { findMany: categoriaFindManyMock },
    mesa_Trabalho: { findMany: mesaFindManyMock },
    operador: { findMany: operadorFindManyMock }
  }
}));

import { GET } from "./route";

describe("/api/tickets/lookups", () => {
  beforeEach(() => {
    guardStaffMock.mockReset();
    tipoFindManyMock.mockReset();
    categoriaFindManyMock.mockReset();
    mesaFindManyMock.mockReset();
    operadorFindManyMock.mockReset();
  });

  it("retorna 401/403 quando a sessão não é de staff", async () => {
    guardStaffMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }));

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("retorna as opções de domínio para staff", async () => {
    guardStaffMock.mockResolvedValueOnce(null);
    tipoFindManyMock.mockResolvedValueOnce([{ id: "t1", nome: "Suporte" }]);
    categoriaFindManyMock.mockResolvedValueOnce([{ id: "c1", nome: "Rede", tipo_ticket_id: "t1" }]);
    mesaFindManyMock.mockResolvedValueOnce([{ id: "m1", nome: "Mesa 1" }]);
    operadorFindManyMock.mockResolvedValueOnce([{ id: "o1", nome: "Ana" }]);

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.tipos).toHaveLength(1);
    expect(body.data.categorias[0].tipo_ticket_id).toBe("t1");
    expect(body.data.mesas[0].id).toBe("m1");
    expect(body.data.operadores[0].id).toBe("o1");
  });
});
