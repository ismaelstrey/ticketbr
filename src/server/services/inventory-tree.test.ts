import { beforeEach, describe, expect, it, vi } from "vitest";

const { equipmentFindManyMock, equipmentFindFirstMock, equipmentFindUniqueMock, solicitanteFindUniqueMock } =
  vi.hoisted(() => ({
    equipmentFindManyMock: vi.fn(),
    equipmentFindFirstMock: vi.fn(),
    equipmentFindUniqueMock: vi.fn(),
    solicitanteFindUniqueMock: vi.fn()
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    equipment: {
      findMany: equipmentFindManyMock,
      findFirst: equipmentFindFirstMock,
      findUnique: equipmentFindUniqueMock
    },
    solicitante: {
      findUnique: solicitanteFindUniqueMock
    }
  }
}));

import { buildInventoryTree, validateParentAssignment } from "./inventory-tree";

// Linha completa conforme o select usado pelo serviço
const row = (overrides: Record<string, unknown> = {}) => ({
  id: "e1",
  name: "proxmox-01",
  type: "HYPERVISOR",
  status: "ACTIVE",
  parentId: null,
  hostname: null,
  ipAddress: null,
  url: null,
  managementIp: null,
  managementController: null,
  virtualizationPlatform: null,
  vmid: null,
  tags: [],
  solicitanteId: null,
  _count: { credentials: 0 },
  ...overrides
});

describe("buildInventoryTree", () => {
  beforeEach(() => {
    equipmentFindManyMock.mockReset();
    solicitanteFindUniqueMock.mockReset();
  });

  it("monta a hierarquia host -> VM -> container", async () => {
    equipmentFindManyMock.mockResolvedValueOnce([
      row({ id: "host", name: "proxmox-01", type: "HYPERVISOR", virtualizationPlatform: "PROXMOX_VE", managementIp: "10.0.0.10" }),
      row({ id: "vm", name: "vm-zabbix", type: "VM", parentId: "host", vmid: 101 }),
      row({ id: "ct", name: "ct-db", type: "CONTAINER", parentId: "vm", vmid: 102 })
    ]);

    const tree = await buildInventoryTree();

    expect(tree.nodes).toHaveLength(1);
    expect(tree.nodes[0].id).toBe("host");
    expect(tree.nodes[0].children).toHaveLength(1);
    expect(tree.nodes[0].children[0].id).toBe("vm");
    expect(tree.nodes[0].children[0].children[0].id).toBe("ct");
  });

  it("calcula o resumo de hosts, VMs, containers e hosts gerenciados", async () => {
    equipmentFindManyMock.mockResolvedValueOnce([
      row({ id: "host1", type: "HYPERVISOR", managementIp: "10.0.0.10" }),
      row({ id: "host2", type: "HYPERVISOR", managementController: "IDRAC" }),
      row({ id: "host3", type: "HYPERVISOR" }),
      row({ id: "vm1", type: "VM", parentId: "host1" }),
      row({ id: "ct1", type: "CONTAINER", parentId: "host1" })
    ]);

    const tree = await buildInventoryTree();

    expect(tree.summary).toEqual({ hosts: 3, vms: 1, containers: 1, managedHosts: 2 });
  });

  it("trata como raiz o recurso cujo pai está fora do escopo", async () => {
    equipmentFindManyMock.mockResolvedValueOnce([row({ id: "vm", type: "VM", parentId: "fora-do-escopo" })]);

    const tree = await buildInventoryTree();

    expect(tree.nodes).toHaveLength(1);
    expect(tree.nodes[0].id).toBe("vm");
  });

  it("não trava com ciclos de dados inconsistentes", async () => {
    equipmentFindManyMock.mockResolvedValueOnce([
      row({ id: "a", type: "VM", parentId: "b" }),
      row({ id: "b", type: "VM", parentId: "a" })
    ]);

    const tree = await buildInventoryTree();

    // Ciclo mútuo não gera recursão infinita; a montagem apenas termina
    expect(Array.isArray(tree.nodes)).toBe(true);
  });

  it("inclui o cliente quando solicitanteId é informado", async () => {
    equipmentFindManyMock.mockResolvedValueOnce([row({ id: "host", type: "HYPERVISOR" })]);
    solicitanteFindUniqueMock.mockResolvedValueOnce({ id: "s1", nome_fantasia: "ACME" });

    const tree = await buildInventoryTree({ solicitanteId: "s1" });

    expect(tree.solicitante).toEqual({ id: "s1", nome_fantasia: "ACME" });
  });

  it("expõe o cliente em cada nó para permitir herança ao adicionar recursos filhos", async () => {
    equipmentFindManyMock.mockResolvedValueOnce([
      row({ id: "host", name: "proxmox-01", type: "HYPERVISOR", solicitanteId: "s1" }),
      row({ id: "vm", name: "vm-zabbix", type: "VM", parentId: "host", solicitanteId: "s1" })
    ]);

    const tree = await buildInventoryTree();

    expect(tree.nodes[0].solicitanteId).toBe("s1");
    expect(tree.nodes[0].children[0].solicitanteId).toBe("s1");
  });
});

describe("validateParentAssignment", () => {
  beforeEach(() => {
    equipmentFindFirstMock.mockReset();
    equipmentFindUniqueMock.mockReset();
  });

  it("retorna 404 quando o pai não existe", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce(null);

    const result = await validateParentAssignment({ parentId: "x", childSolicitanteId: null });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("rejeita pai que não aceita filhos", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce({ id: "sw", type: "SWITCH", solicitanteId: null });

    const result = await validateParentAssignment({ parentId: "sw", childSolicitanteId: null });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it("rejeita cliente divergente do pai", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce({ id: "host", type: "HYPERVISOR", solicitanteId: "s1" });

    const result = await validateParentAssignment({ parentId: "host", childSolicitanteId: "s2" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it("herda o cliente do pai quando o filho não informa", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce({ id: "host", type: "HYPERVISOR", solicitanteId: "s1" });

    const result = await validateParentAssignment({ parentId: "host", childSolicitanteId: null });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.parent.solicitanteId).toBe("s1");
  });

  it("impede que o recurso seja pai dele mesmo", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce({ id: "a", type: "VM", solicitanteId: null });

    const result = await validateParentAssignment({ parentId: "a", childSolicitanteId: null, childId: "a" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it("impede ciclos na hierarquia", async () => {
    // a -> b -> c, tentando definir a como filho de c
    equipmentFindFirstMock.mockResolvedValueOnce({ id: "c", type: "VM", solicitanteId: null });
    equipmentFindUniqueMock
      .mockResolvedValueOnce({ parentId: "b" })
      .mockResolvedValueOnce({ parentId: "a" })
      .mockResolvedValueOnce({ parentId: null });

    const result = await validateParentAssignment({ parentId: "c", childSolicitanteId: null, childId: "a" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("ciclo");
  });
});
