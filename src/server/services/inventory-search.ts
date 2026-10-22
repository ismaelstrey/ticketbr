import { prisma, Prisma } from "@/lib/prisma";
import type { InfraSearchResult, EquipmentType } from "@/types/inventory";

type PathNode = { id: string; name: string; parentId: string | null };

/**
 * Monta o caminho canônico do recurso subindo a hierarquia.
 * Ex.: "ACME / proxmox-01 / vm-zabbix".
 */
function buildPath(nodeId: string, byId: Map<string, PathNode>, clientName: string): string {
  const parts: string[] = [];
  const visited = new Set<string>();
  let current = byId.get(nodeId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  if (clientName) parts.unshift(clientName);
  return parts.join(" / ");
}

/**
 * Busca rápida no inventário respondendo "onde está o recurso?".
 * Casa por identificação do equipamento e também por rótulo/usuário/link de credenciais.
 */
export async function searchInventory(options: {
  q: string;
  solicitanteId?: string;
  limit?: number;
}): Promise<InfraSearchResult[]> {
  const term = options.q.trim();
  const limit = options.limit ?? 15;
  if (term.length < 2) return [];

  const scope = options.solicitanteId ? { solicitanteId: options.solicitanteId } : {};
  const numeric = Number.parseInt(term, 10);
  const hasNumeric = String(numeric) === term && Number.isFinite(numeric);

  // Credenciais que casam com o termo (rótulo, usuário ou link) revelam o equipamento vinculado
  const credentialMatches = await prisma.equipmentCredential.findMany({
    where: {
      deleted_at: null,
      equipmentId: { not: null },
      equipment: { deleted_at: null, ...scope },
      OR: [
        { label: { contains: term, mode: "insensitive" } },
        { username: { contains: term, mode: "insensitive" } },
        { url: { contains: term, mode: "insensitive" } }
      ]
    },
    select: { equipmentId: true },
    take: 200
  });
  const credentialEquipmentIds = Array.from(
    new Set(credentialMatches.map((row) => row.equipmentId).filter((id): id is string => Boolean(id)))
  );

  const or: Prisma.EquipmentWhereInput[] = [
    { name: { contains: term, mode: "insensitive" } },
    { code: { contains: term, mode: "insensitive" } },
    { hostname: { contains: term, mode: "insensitive" } },
    { ipAddress: { contains: term } },
    { managementIp: { contains: term } },
    { func: { contains: term, mode: "insensitive" } },
    { description: { contains: term, mode: "insensitive" } },
    { tags: { has: term } }
  ];
  if (hasNumeric) or.push({ vmid: numeric });
  if (credentialEquipmentIds.length) or.push({ id: { in: credentialEquipmentIds } });

  const matches = await prisma.equipment.findMany({
    where: { deleted_at: null, ...scope, OR: or },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      type: true,
      code: true,
      hostname: true,
      ipAddress: true,
      managementIp: true,
      url: true,
      vmid: true,
      func: true,
      tags: true,
      description: true,
      solicitante: { select: { id: true, nome_fantasia: true } }
    }
  });

  if (!matches.length) return [];

  // Mapa leve do escopo para derivar o caminho de cada resultado
  const scopeRows = await prisma.equipment.findMany({
    where: { deleted_at: null, ...scope },
    select: { id: true, name: true, parentId: true }
  });
  const byId = new Map<string, PathNode>(scopeRows.map((row) => [row.id, row]));

  const lower = term.toLowerCase();
  const includes = (value: string | null) => Boolean(value && value.toLowerCase().includes(lower));

  return matches.map((row) => {
    const matchedOn: string[] = [];
    if (includes(row.name)) matchedOn.push("nome");
    if (includes(row.code)) matchedOn.push("código");
    if (includes(row.hostname)) matchedOn.push("hostname");
    if (includes(row.ipAddress)) matchedOn.push("IP");
    if (includes(row.managementIp)) matchedOn.push("IP de gerência");
    if (includes(row.func)) matchedOn.push("função");
    if (includes(row.description)) matchedOn.push("descrição");
    if (row.tags.some((tag) => tag.toLowerCase().includes(lower))) matchedOn.push("tag");
    if (hasNumeric && row.vmid === numeric) matchedOn.push("VMID");
    if (credentialEquipmentIds.includes(row.id)) matchedOn.push("credencial");

    return {
      id: row.id,
      name: row.name,
      type: row.type as EquipmentType,
      path: buildPath(row.id, byId, row.solicitante?.nome_fantasia ?? ""),
      solicitante: row.solicitante,
      ipAddress: row.ipAddress ?? row.managementIp ?? null,
      url: row.url,
      matchedOn
    };
  });
}
