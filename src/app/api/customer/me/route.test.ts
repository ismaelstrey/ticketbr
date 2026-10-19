import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireCustomerContextMock,
  userFindUniqueMock,
  userUpdateMock,
  funcionarioUpdateManyMock,
  compareMock,
  hashMock,
  writeAuditLogMock
} = vi.hoisted(() => ({
  requireCustomerContextMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userUpdateMock: vi.fn(),
  funcionarioUpdateManyMock: vi.fn(),
  compareMock: vi.fn(),
  hashMock: vi.fn(),
  writeAuditLogMock: vi.fn()
}));

vi.mock("@/server/services/customer-context", () => ({
  requireCustomerContext: requireCustomerContextMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock, update: userUpdateMock },
    funcionario: { updateMany: funcionarioUpdateManyMock }
  }
}));

vi.mock("bcryptjs", () => ({
  compare: compareMock,
  hash: hashMock
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock
}));

import { PATCH } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/customer/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("PATCH /api/customer/me", () => {
  beforeEach(() => {
    requireCustomerContextMock.mockReset();
    userFindUniqueMock.mockReset();
    userUpdateMock.mockReset();
    funcionarioUpdateManyMock.mockReset();
    compareMock.mockReset();
    hashMock.mockReset();
    writeAuditLogMock.mockReset();

    requireCustomerContextMock.mockResolvedValue({
      user: { id: "u1", email: "cli@user.com", name: "Cliente", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "Empresa", razao_social: "Empresa LTDA", email: "e@e.com" },
      member: { id: "f1", solicitante_id: "s1", isAdmin: false }
    });
    userUpdateMock.mockResolvedValue({
      id: "u1",
      email: "cli@user.com",
      name: "Cliente Editado",
      role: "CUSTOMER"
    });
    funcionarioUpdateManyMock.mockResolvedValue({ count: 1 });
    hashMock.mockResolvedValue("novo-hash");
  });

  it("atualiza o nome e sincroniza o funcionário", async () => {
    const res = await PATCH(makeRequest({ name: "Cliente Editado" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.name).toBe("Cliente Editado");
    expect(funcionarioUpdateManyMock).toHaveBeenCalledWith({
      where: { userId: "u1" },
      data: { nome: "Cliente Editado" }
    });
    expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
  });

  it("retorna 400 quando o nome é vazio", async () => {
    const res = await PATCH(makeRequest({ name: "   " }));

    expect(res.status).toBe(400);
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando nenhuma alteração é informada", async () => {
    const res = await PATCH(makeRequest({}));

    expect(res.status).toBe(400);
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando a nova senha é curta demais", async () => {
    const res = await PATCH(makeRequest({ currentPassword: "atual", newPassword: "123" }));

    expect(res.status).toBe(400);
    expect(compareMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando a senha atual está incorreta", async () => {
    userFindUniqueMock.mockResolvedValueOnce({ password: "hash-antigo" });
    compareMock.mockResolvedValueOnce(false);

    const res = await PATCH(makeRequest({ currentPassword: "errada", newPassword: "novaSenha123" }));

    expect(res.status).toBe(400);
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("troca a senha quando a senha atual confere", async () => {
    userFindUniqueMock.mockResolvedValueOnce({ password: "hash-antigo" });
    compareMock.mockResolvedValueOnce(true);

    const res = await PATCH(makeRequest({ currentPassword: "correta", newPassword: "novaSenha123" }));

    expect(res.status).toBe(200);
    expect(hashMock).toHaveBeenCalledWith("novaSenha123", 10);
    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { password: "novo-hash" } })
    );
  });

  it("retorna 401 quando não há sessão de cliente", async () => {
    requireCustomerContextMock.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

    const res = await PATCH(makeRequest({ name: "x" }));

    expect(res.status).toBe(401);
  });
});
