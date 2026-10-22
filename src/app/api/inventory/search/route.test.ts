import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStaffSessionMock, searchInventoryMock } = vi.hoisted(() => ({
  requireStaffSessionMock: vi.fn(),
  searchInventoryMock: vi.fn()
}));

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/server/services/inventory-search", () => ({
  searchInventory: searchInventoryMock
}));

describe("/api/inventory/search", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    searchInventoryMock.mockReset();
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
  });

  it(
    "GET retorna os resultados da busca com o total",
    async () => {
      searchInventoryMock.mockResolvedValueOnce([
        { id: "vm", name: "vm-zabbix", type: "VM", path: "ACME / vm-zabbix", solicitante: null, ipAddress: null, url: null, matchedOn: ["nome"] }
      ]);

      const { GET } = await import("./route");
      const req = { nextUrl: { searchParams: new URLSearchParams({ q: "zabbix" }) } } as any;
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.total).toBe(1);
      expect(searchInventoryMock).toHaveBeenCalledWith({ q: "zabbix", limit: 15 });
    },
    20000
  );

  it(
    "GET retorna 400 quando o termo é curto demais",
    async () => {
      const { GET } = await import("./route");
      const req = { nextUrl: { searchParams: new URLSearchParams({ q: "z" }) } } as any;
      const res = await GET(req);

      expect(res.status).toBe(400);
      expect(searchInventoryMock).not.toHaveBeenCalled();
    },
    20000
  );

  it(
    "GET retorna 403 quando o acesso é proibido",
    async () => {
      requireStaffSessionMock.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const { GET } = await import("./route");
      const req = { nextUrl: { searchParams: new URLSearchParams({ q: "zabbix" }) } } as any;
      const res = await GET(req);

      expect(res.status).toBe(403);
    },
    20000
  );
});
