import { prisma } from "@/lib/prisma";
import type { InfraTree, InfraTreeNode, EquipmentType } from "@/types/inventory";

// Tipos exibidos na árvore de infraestrutura (host -> VM -> container)
const INFRA_TYPES: EquipmentType[] = ["SERVER", "HYPERVISOR", "VM", "CONTAINER"];

// Tipos que podem ser pai de outro recurso (host de VMs ou VM com containers)
const PARENT_TYPES: EquipmentType[] = ["SERVER", "HYPERVISOR", "VM"];

export type ParentAssignment =
  | { ok: true; parent: { id: string; solicitanteId: string | null } }
  | { ok: false; status: number; error: string };

/**
 * Valida o vínculo de hierarquia (parentId) antes de gravar.
 * Garante que o pai existe, aceita filhos, pertence ao mesmo cliente e não gera ciclo.
 */
export async function validateParentAssignment(options: {
  parentId: string;
  childSolicitanteId: string | null;
  childId?: string;
}): Promise<ParentAssignment> {
  const parent = await prisma.equipment.findFirst({
    where: { id: options.parentId, deleted_at: null },
    select: { id: true, type: true, solicitanteId: true }
  });

  if (!parent) return { ok: false, status: 404, error: "Equipamento pai não encontrado" };
  if (!PARENT_TYPES.includes(parent.type)) {
    return { ok: false, status: 409, error: "Este equipamento não pode receber recursos vinculados" };
  }
  if (options.childId && parent.id === options.childId) {
    return { ok: false, status: 409, error: "Um equipamento não pode ser pai dele mesmo" };
  }
  // O filho pertence ao mesmo cliente do pai; quando não informado, herda o do pai
  if (options.childSolicitanteId !== null && parent.solicitanteId !== options.childSolicitanteId) {
    return { ok: false, status: 409, error: "O recurso pertence a outro cliente do host informado" };
  }

  // Sobe a cadeia do pai para impedir ciclos (ex.: A -> B -> A)
  if (options.childId) {
    const visited = new Set<string>();
    let currentId: string | null = parent.id;
    while (currentId && !visited.has(currentId)) {
      if (currentId === options.childId) {
        return { ok: false, status: 409, error: "Hierarquia inválida: vínculo gera ciclo" };
      }
      visited.add(currentId);
      const node: { parentId: string | null } | null = await prisma.equipment.findUnique({
        where: { id: currentId },
        select: { parentId: true }
      });
      currentId = node?.parentId ?? null;
    }
  }

  return { ok: true, parent: { id: parent.id, solicitanteId: parent.solicitanteId } };
}

type TreeRow = {
  id: string;
  name: string;
  type: EquipmentType;
  status: "ACTIVE" | "MAINTENANCE" | "INACTIVE" | "RETIRED";
  parentId: string | null;
  hostname: string | null;
  ipAddress: string | null;
  url: string | null;
  managementIp: string | null;
  managementController: "NONE" | "ILO" | "IDRAC" | "IPMI" | "ILO_AND_IDRAC" | "OTHER" | null;
  virtualizationPlatform:
    | "PROXMOX_VE"
    | "VMWARE_ESXI"
    | "VMWARE_VCENTER"
    | "MICROSOFT_HYPERV"
    | "XCP_NG"
    | "KVM"
    | "OTHER"
    | null;
  vmid: number | null;
  tags: string[];
  _count: { credentials: number };
};

/**
 * Monta a árvore de infraestrutura (host -> VM -> container) de um cliente.
 * Sem `solicitanteId`, retorna a infraestrutura de todos os clientes.
 */
export async function buildInventoryTree(options: { solicitanteId?: string } = {}): Promise<InfraTree> {
  const scope = options.solicitanteId ? { solicitanteId: options.solicitanteId } : {};

  const [rows, solicitante] = await Promise.all([
    prisma.equipment.findMany({
      where: { deleted_at: null, type: { in: INFRA_TYPES }, ...scope },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        parentId: true,
        hostname: true,
        ipAddress: true,
        url: true,
        managementIp: true,
        managementController: true,
        virtualizationPlatform: true,
        vmid: true,
        tags: true,
        _count: { select: { credentials: { where: { deleted_at: null } } } }
      }
    }),
    options.solicitanteId
      ? prisma.solicitante.findUnique({
          where: { id: options.solicitanteId },
          select: { id: true, nome_fantasia: true }
        })
      : Promise.resolve(null)
  ]);

  const nodes = new Map<string, InfraTreeNode>();
  for (const row of rows as TreeRow[]) {
    nodes.set(row.id, {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      hostname: row.hostname,
      ipAddress: row.ipAddress,
      url: row.url,
      managementIp: row.managementIp,
      managementController: row.managementController,
      virtualizationPlatform: row.virtualizationPlatform,
      vmid: row.vmid,
      tags: row.tags,
      credentialCount: row._count.credentials,
      children: []
    });
  }

  // Vincula os filhos aos pais. Ciclos (dados inconsistentes) não são anexados,
  // evitando recursão infinita na renderização.
  const attached = new Set<string>();
  for (const row of rows as TreeRow[]) {
    const node = row.parentId ? nodes.get(row.id) : undefined;
    const parent = row.parentId ? nodes.get(row.parentId) : undefined;
    if (node && parent && parent.id !== node.id && !attached.has(node.id)) {
      parent.children.push(node);
      attached.add(node.id);
    }
  }

  const roots: InfraTreeNode[] = [];
  for (const row of rows as TreeRow[]) {
    const node = nodes.get(row.id);
    if (!node || attached.has(row.id)) continue;
    roots.push(node);
  }

  const summary = {
    hosts: (rows as TreeRow[]).filter((row) => row.type === "HYPERVISOR").length,
    vms: (rows as TreeRow[]).filter((row) => row.type === "VM").length,
    containers: (rows as TreeRow[]).filter((row) => row.type === "CONTAINER").length,
    managedHosts: (rows as TreeRow[]).filter(
      (row) =>
        row.type === "HYPERVISOR" &&
        (Boolean(row.managementIp) || (row.managementController !== null && row.managementController !== "NONE"))
    ).length
  };

  return { solicitante, summary, nodes: roots };
}
