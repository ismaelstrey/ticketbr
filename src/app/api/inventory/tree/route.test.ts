import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const buildInventoryTreeMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/server/services/inventory-tree", () => ({
  buildInventoryTree: buildInventoryTreeMock
}));

describe("/api/inventory/tree", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    buildInventoryTreeMock.mockReset();
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
  });

  it("GET retorna a árvore de infraestrutura", async () => {
    buildInventoryTreeMock.mockResolvedValueOnce({ solicitante: null, summary: {}, nodes: [] });

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ solicitanteId: "s1" }) } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(buildInventoryTreeMock).toHaveBeenCalledWith({ solicitanteId: "s1" });
    expect(body.data).toBeDefined();
  });

  it("GET retorna 401 quando não autenticado", async () => {
    requireStaffSessionMock.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});
