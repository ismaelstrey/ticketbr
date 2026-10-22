import { beforeEach, describe, expect, it, vi } from "vitest";

const { credentialFindManyMock, equipmentFindManyMock } = vi.hoisted(() => ({
  credentialFindManyMock: vi.fn(),
  equipmentFindManyMock: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  Prisma: {},
  prisma: {
    equipmentCredential: { findMany: credentialFindManyMock },
    equipment: { findMany: equipmentFindManyMock }
  }
}));

import { searchInventory } from "./inventory-search";

describe("searchInventory", () => {
  beforeEach(() => {
    credentialFindManyMock.mockReset();
    equipmentFindManyMock.mockReset();
    credentialFindManyMock.mockResolvedValue([]);
  });

  it("retorna vazio para termos com menos de 2 caracteres", async () => {
    const results = await searchInventory({ q: "z" });

    expect(results).toEqual([]);
    expect(equipmentFindManyMock).not.toHaveBeenCalled();
  });

  it("monta o caminho hierárquico do recurso encontrado", async () => {
    // 1ª chamada: equipamentos que casam; 2ª chamada: escopo para derivar o caminho
    equipmentFindManyMock
      .mockResolvedValueOnce([
        {
          id: "vm",
          name: "vm-zabbix",
          type: "VM",
          code: null,
          hostname: null,
          ipAddress: "10.0.0.20",
          managementIp: null,
          url: null,
          vmid: 101,
          func: null,
          tags: [],
          description: null,
          solicitante: { id: "s1", nome_fantasia: "ACME" }
        }
      ])
      .mockResolvedValueOnce([
        { id: "vm", name: "vm-zabbix", parentId: "host" },
        { id: "host", name: "proxmox-01", parentId: null }
      ]);

    const results = await searchInventory({ q: "zabbix" });

    expect(results).toHaveLength(1);
    expect(results[0].path).toBe("ACME / proxmox-01 / vm-zabbix");
    expect(results[0].matchedOn).toContain("nome");
  });

  it("revela o equipamento vinculado a uma credencial correspondente", async () => {
    credentialFindManyMock.mockResolvedValueOnce([{ equipmentId: "host" }]);
    equipmentFindManyMock
      .mockResolvedValueOnce([
        {
          id: "host",
          name: "proxmox-01",
          type: "HYPERVISOR",
          code: null,
          hostname: "proxmox-01",
          ipAddress: "10.0.0.10",
          managementIp: null,
          url: null,
          vmid: null,
          func: null,
          tags: [],
          description: null,
          solicitante: { id: "s1", nome_fantasia: "ACME" }
        }
      ])
      .mockResolvedValueOnce([{ id: "host", name: "proxmox-01", parentId: null }]);

    const results = await searchInventory({ q: "root" });

    expect(results[0].matchedOn).toContain("credencial");
  });

  it("detecta o VMID numérico", async () => {
    equipmentFindManyMock
      .mockResolvedValueOnce([
        {
          id: "vm",
          name: "vm-101",
          type: "VM",
          code: null,
          hostname: null,
          ipAddress: null,
          managementIp: null,
          url: null,
          vmid: 101,
          func: null,
          tags: [],
          description: null,
          solicitante: null
        }
      ])
      .mockResolvedValueOnce([{ id: "vm", name: "vm-101", parentId: null }]);

    const results = await searchInventory({ q: "101" });

    expect(results[0].matchedOn).toContain("VMID");
  });
});
