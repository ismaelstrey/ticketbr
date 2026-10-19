import { beforeEach, describe, expect, it, vi } from "vitest";

// Sessão e banco mockados para exercitar apenas as regras de autorização
const getSessionMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSession: () => getSessionMock()
}));

const findUniqueMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args)
    }
  }
}));

import { guardAdmin, guardStaff, requireAdminSession, requireStaffSession } from "./staff-context";

describe("requireStaffSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lança UNAUTHORIZED quando não há sessão", async () => {
    getSessionMock.mockResolvedValue(null);
    await expect(requireStaffSession()).rejects.toThrow("UNAUTHORIZED");
  });

  it("lança FORBIDDEN quando o papel da sessão não é de staff", async () => {
    getSessionMock.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    await expect(requireStaffSession()).rejects.toThrow("FORBIDDEN");
  });

  it("lança UNAUTHORIZED quando o usuário não existe no banco", async () => {
    getSessionMock.mockResolvedValue({ id: "u1", role: "AGENT" });
    findUniqueMock.mockResolvedValue(null);
    await expect(requireStaffSession()).rejects.toThrow("UNAUTHORIZED");
  });

  it("lança FORBIDDEN quando o papel no banco divergiu da sessão", async () => {
    getSessionMock.mockResolvedValue({ id: "u1", role: "AGENT" });
    findUniqueMock.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    await expect(requireStaffSession()).rejects.toThrow("FORBIDDEN");
  });

  it("retorna a sessão de staff com nome padrão quando ausente", async () => {
    getSessionMock.mockResolvedValue({ id: "u1", role: "AGENT", email: "agente@empresa.com" });
    findUniqueMock.mockResolvedValue({ id: "u1", role: "AGENT" });

    const session = await requireStaffSession();
    expect(session).toEqual({
      userId: "u1",
      role: "AGENT",
      name: "Usuário",
      email: "agente@empresa.com"
    });
  });

  it("aceita o identificador vindo da claim sub", async () => {
    getSessionMock.mockResolvedValue({ sub: "u2", role: "ADMIN", name: "Ana" });
    findUniqueMock.mockResolvedValue({ id: "u2", role: "ADMIN" });

    const session = await requireStaffSession();
    expect(session.userId).toBe("u2");
    expect(session.name).toBe("Ana");
  });
});

describe("requireAdminSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna a sessão quando o usuário é ADMIN", async () => {
    getSessionMock.mockResolvedValue({ id: "adm", role: "ADMIN" });
    findUniqueMock.mockResolvedValue({ id: "adm", role: "ADMIN" });

    await expect(requireAdminSession()).resolves.toMatchObject({ userId: "adm", role: "ADMIN" });
  });

  it("lança FORBIDDEN quando o usuário é apenas AGENT", async () => {
    getSessionMock.mockResolvedValue({ id: "ag", role: "AGENT" });
    findUniqueMock.mockResolvedValue({ id: "ag", role: "AGENT" });

    await expect(requireAdminSession()).rejects.toThrow("FORBIDDEN");
  });
});

describe("guardStaff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna null quando a sessão de staff é válida", async () => {
    getSessionMock.mockResolvedValue({ id: "u1", role: "AGENT" });
    findUniqueMock.mockResolvedValue({ id: "u1", role: "AGENT" });

    await expect(guardStaff()).resolves.toBeNull();
  });

  it("retorna 401 quando não há sessão", async () => {
    getSessionMock.mockResolvedValue(null);
    const response = await guardStaff();

    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("retorna 403 quando o papel não é de staff", async () => {
    getSessionMock.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    const response = await guardStaff();

    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({ error: "Forbidden" });
  });
});

describe("guardAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna null quando o usuário é ADMIN", async () => {
    getSessionMock.mockResolvedValue({ id: "adm", role: "ADMIN" });
    findUniqueMock.mockResolvedValue({ id: "adm", role: "ADMIN" });

    await expect(guardAdmin()).resolves.toBeNull();
  });

  it("retorna 403 quando o usuário é apenas AGENT", async () => {
    getSessionMock.mockResolvedValue({ id: "ag", role: "AGENT" });
    findUniqueMock.mockResolvedValue({ id: "ag", role: "AGENT" });

    const response = await guardAdmin();
    expect(response?.status).toBe(403);
  });
});
