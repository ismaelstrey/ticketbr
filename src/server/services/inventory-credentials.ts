import { MASKED_SECRET } from "@/lib/vault";
import type { CredentialAccessDecision } from "./inventory-access";

// Campos comuns das credenciais nas respostas — nunca inclui o segredo em claro
export const credentialSelect = {
  id: true,
  equipmentId: true,
  label: true,
  protocol: true,
  port: true,
  username: true,
  // Link de acesso direto do recurso (ex.: console web do Proxmox/iLO)
  url: true,
  notes: true,
  accessPolicy: true,
  ownerUserId: true,
  owner: { select: { id: true, name: true } },
  equipment: { select: { id: true, name: true, hostname: true, ipAddress: true } },
  // Quando a credencial reaproveita a senha padrão do cliente, é dela que vem o segredo
  sharedSecretId: true,
  sharedSecret: { select: { id: true, label: true, updated_at: true } },
  lastRotatedAt: true,
  created_at: true,
  updated_at: true
} as const;

type CredentialRow = {
  id: string;
  equipmentId: string | null;
  label: string;
  protocol: string;
  port: number | null;
  username: string | null;
  url: string | null;
  notes: string | null;
  accessPolicy: string;
  ownerUserId: string | null;
  owner?: { id: string; name: string } | null;
  equipment?: { id: string; name: string; hostname: string | null; ipAddress: string | null } | null;
  sharedSecretId?: string | null;
  sharedSecret?: { id: string; label: string; updated_at: Date } | null;
  lastRotatedAt: Date | null;
  created_at: Date;
  updated_at: Date;
};

/**
 * Deriva o link de acesso da credencial.
 * Usa o link informado manualmente e, quando ausente, monta a URL a partir
 * do host/IP do equipamento para protocolos web (HTTP/HTTPS).
 */
function buildLoginUrl(credential: CredentialRow): string | null {
  if (credential.url) return credential.url;

  const protocol = credential.protocol?.toLowerCase();
  if (protocol !== "http" && protocol !== "https") return null;

  const host = credential.equipment?.hostname || credential.equipment?.ipAddress;
  if (!host) return null;

  return `${protocol}://${host}${credential.port ? `:${credential.port}` : ""}`;
}

/**
 * Monta a resposta de uma credencial aplicando a máscara da senha e o resultado da autorização.
 */
export function toCredentialDto(
  credential: CredentialRow,
  decision: CredentialAccessDecision,
  extras?: { equipmentName?: string | null }
) {
  const shared = credential.sharedSecret ?? null;
  return {
    id: credential.id,
    equipmentId: credential.equipmentId,
    equipmentName: extras?.equipmentName ?? credential.equipment?.name ?? null,
    label: credential.label,
    protocol: credential.protocol,
    port: credential.port,
    username: credential.username,
    url: credential.url,
    loginUrl: buildLoginUrl(credential),
    secret: MASKED_SECRET,
    notes: credential.notes,
    accessPolicy: credential.accessPolicy,
    ownerUserId: credential.ownerUserId,
    ownerName: credential.owner?.name ?? null,
    sharedSecretId: credential.sharedSecretId ?? null,
    sharedSecretLabel: shared?.label ?? null,
    // Com senha padrão, a data de rotação é a da última troca da senha compartilhada
    lastRotatedAt: shared ? shared.updated_at : credential.lastRotatedAt,
    canReveal: decision.canReveal,
    accessVia: decision.via,
    createdAt: credential.created_at,
    updatedAt: credential.updated_at
  };
}

// Campos comuns das senhas padrão por cliente nas respostas (senha sempre mascarada)
export const sharedSecretSelect = {
  id: true,
  solicitanteId: true,
  label: true,
  notes: true,
  created_at: true,
  updated_at: true
} as const;

type SharedSecretRow = {
  id: string;
  solicitanteId: string;
  label: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  _count?: { credentials: number };
};

/**
 * Monta a resposta de uma senha padrão do cliente, sempre com a senha mascarada.
 */
export function toSharedSecretDto(credential: SharedSecretRow, extras?: { credentialCount?: number }) {
  return {
    id: credential.id,
    solicitanteId: credential.solicitanteId,
    label: credential.label,
    secret: MASKED_SECRET,
    notes: credential.notes,
    credentialCount: extras?.credentialCount ?? credential._count?.credentials ?? 0,
    createdAt: credential.created_at,
    updatedAt: credential.updated_at
  };
}
