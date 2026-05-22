import { beforeEach, describe, expect, it, vi } from "vitest";

const hashMock = vi.fn();
const queryRawUnsafeMock = vi.fn();
const whatsAppContactFindManyMock = vi.fn();
const funcionarioFindFirstMock = vi.fn();
const funcionarioUpdateMock = vi.fn();
const userUpdateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("bcryptjs", () => ({
  default: {
    hash: hashMock
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: queryRawUnsafeMock,
    whatsAppContact: {
      findMany: whatsAppContactFindManyMock
    },
    funcionario: {
      findFirst: funcionarioFindFirstMock
    },
    $transaction: transactionMock
  }
}));

describe("/api/solicitantes/[id]/funcionarios/[funcionarioId]", () => {
  beforeEach(() => {
    vi.resetModules();
    hashMock.mockReset();
    queryRawUnsafeMock.mockReset();
    whatsAppContactFindManyMock.mockReset();
    funcionarioFindFirstMock.mockReset();
    funcionarioUpdateMock.mockReset();
    userUpdateMock.mockReset();
    transactionMock.mockReset();

    queryRawUnsafeMock.mockResolvedValue([{ exists: true }]);
    whatsAppContactFindManyMock.mockResolvedValue([]);
    funcionarioFindFirstMock.mockResolvedValue({
      id: "f1",
      userId: "u1",
      solicitante_id: "s1",
      nome: "Cliente",
      email: "cliente@acme.com",
      telefone: "51999999999"
    });
    funcionarioUpdateMock.mockResolvedValue({ id: "f1", nome: "Cliente Editado" });
    userUpdateMock.mockResolvedValue({ id: "u1" });
    transactionMock.mockImplementation(async (callback) => callback({
      funcionario: { update: funcionarioUpdateMock },
      user: { update: userUpdateMock }
    }));
  });

  it("PUT atualiza a senha do usuario quando password e informado", async () => {
    hashMock.mockResolvedValue("hashed-password");

    const { PUT } = await import("./route");
    const req = {
      json: async () => ({
        nome: "Cliente Editado",
        email: "cliente.editado@acme.com",
        telefone: "51988888888",
        password: "nova123"
      })
    } as any;

    const res = await PUT(req, { params: Promise.resolve({ id: "s1", funcionarioId: "f1" }) });

    expect(res.status).toBe(200);
    expect(hashMock).toHaveBeenCalledWith("nova123", 10);
    expect(userUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "u1" },
      data: expect.objectContaining({ password: "hashed-password" })
    }));
  });

  it("PUT mantem a senha atual quando password vem vazio", async () => {
    const { PUT } = await import("./route");
    const req = {
      json: async () => ({
        nome: "Cliente Editado",
        email: "cliente.editado@acme.com",
        telefone: "51988888888",
        password: ""
      })
    } as any;

    const res = await PUT(req, { params: Promise.resolve({ id: "s1", funcionarioId: "f1" }) });

    expect(res.status).toBe(200);
    expect(hashMock).not.toHaveBeenCalled();
    expect(userUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ password: expect.anything() })
    }));
  });
});
