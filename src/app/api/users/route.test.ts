import { beforeEach, describe, expect, it, vi } from "vitest";

const guardAdminMock = vi.fn();
const findManyMock = vi.fn();
const createMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  guardAdmin: guardAdminMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: findManyMock,
      create: createMock
    }
  }
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(async () => "hash-fake") }
}));

describe("/api/users", () => {
  beforeEach(() => {
    vi.resetModules();
    guardAdminMock.mockReset();
    findManyMock.mockReset();
    createMock.mockReset();
  });

  it("GET retorna 401 quando não autenticado", async () => {
    guardAdminMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const { GET } = await import("./route");
    const res = await GET();

    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("GET retorna 403 quando autenticado sem perfil ADMIN", async () => {
    guardAdminMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    );

    const { GET } = await import("./route");
    const res = await GET();

    expect(res.status).toBe(403);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("GET retorna lista sem expor hash de senha", async () => {
    guardAdminMock.mockResolvedValueOnce(null);
    findManyMock.mockResolvedValueOnce([{ id: "u1", name: "Admin", email: "a@a.com", role: "ADMIN" }]);

    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    // A projeção de select nunca deve incluir o campo password
    expect(findManyMock.mock.calls[0][0].select.password).toBeUndefined();
  });
});
