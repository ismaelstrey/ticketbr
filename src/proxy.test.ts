import { jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

vi.mock("@/lib/constants", () => ({
  getJwtKey: vi.fn(() => new TextEncoder().encode("test-secret"))
}));

vi.mock("jose", () => ({
  jwtVerify: vi.fn()
}));

const jwtVerifyMock = vi.mocked(jwtVerify);

function request(pathname: string, token = "token") {
  return new NextRequest(new Request(`http://localhost:3000${pathname}`, {
    headers: token ? { cookie: `token=${token}` } : undefined
  }));
}

describe("proxy customer access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redireciona CUSTOMER para o portal ao acessar modulos internos", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: { role: "CUSTOMER" } } as any);

    const response = await proxy(request("/settings"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/cliente");
  });

  it("bloqueia APIs internas para CUSTOMER", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: { role: "CUSTOMER" } } as any);

    const response = await proxy(request("/api/projects"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("permite APIs do portal do cliente para CUSTOMER", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: { role: "CUSTOMER" } } as any);

    const response = await proxy(request("/api/customer/tickets"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("mantem staff fora do portal do cliente", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: { role: "ADMIN" } } as any);

    const response = await proxy(request("/cliente"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
