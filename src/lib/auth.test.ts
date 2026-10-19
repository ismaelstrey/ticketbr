/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Armazena os cookies em memória para simular o contexto de requisição do Next
const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn()
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore)
}));

import { getSession, login, logout, signJWT, verifyJWT } from "@/lib/auth";

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-jwt-secret";
  });

  it("assina e verifica um JWT preservando as claims", async () => {
    const token = await signJWT({ sub: "user-1", role: "ADMIN" });
    expect(typeof token).toBe("string");

    const payload = await verifyJWT(token);
    expect(payload?.sub).toBe("user-1");
    expect(payload?.role).toBe("ADMIN");
  });

  it("lança erro ao assinar sem JWT_SECRET configurado", async () => {
    delete process.env.JWT_SECRET;
    await expect(signJWT({ sub: "user-1" })).rejects.toThrow("JWT_SECRET environment variable is not set.");
  });

  it("retorna null ao verificar token inválido", async () => {
    await expect(verifyJWT("token-invalido")).resolves.toBeNull();
  });

  it("retorna null ao verificar token sem segredo configurado", async () => {
    const token = await signJWT({ sub: "user-1" });
    delete process.env.JWT_SECRET;
    await expect(verifyJWT(token)).resolves.toBeNull();
  });

  it("retorna null quando não existe cookie de sessão", async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(getSession()).resolves.toBeNull();
  });

  it("retorna o payload quando o cookie de sessão é válido", async () => {
    const token = await signJWT({ sub: "user-2", role: "AGENT" });
    cookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session?.sub).toBe("user-2");
    expect(session?.role).toBe("AGENT");
  });

  it("faz login gravando o cookie HTTP-only do token", async () => {
    const token = await login({ sub: "user-3", role: "ADMIN" });

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const [name, value, options] = cookieStore.set.mock.calls[0];
    expect(name).toBe("token");
    expect(value).toBe(token);
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60
    });

    expect((await verifyJWT(token))?.sub).toBe("user-3");
  });

  it("faz logout removendo o cookie de sessão", async () => {
    await logout();
    expect(cookieStore.delete).toHaveBeenCalledWith("token");
  });
});
