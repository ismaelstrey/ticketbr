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
  notes: true,
  accessPolicy: true,
  ownerUserId: true,
  owner: { select: { id: true, name: true } },
  equipment: { select: { id: true, name: true } },
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
  notes: string | null;
  accessPolicy: string;
  ownerUserId: string | null;
  owner?: { id: string; name: string } | null;
  equipment?: { id: string; name: string } | null;
  lastRotatedAt: Date | null;
  created_at: Date;
  updated_at: Date;
};

/**
 * Monta a resposta de uma credencial aplicando a máscara da senha e o resultado da autorização.
 */
export function toCredentialDto(
  credential: CredentialRow,
  decision: CredentialAccessDecision,
  extras?: { equipmentName?: string | null }
) {
  return {
    id: credential.id,
    equipmentId: credential.equipmentId,
    equipmentName: extras?.equipmentName ?? credential.equipment?.name ?? null,
    label: credential.label,
    protocol: credential.protocol,
    port: credential.port,
    username: credential.username,
    secret: MASKED_SECRET,
    notes: credential.notes,
    accessPolicy: credential.accessPolicy,
    ownerUserId: credential.ownerUserId,
    ownerName: credential.owner?.name ?? null,
    lastRotatedAt: credential.lastRotatedAt,
    canReveal: decision.canReveal,
    accessVia: decision.via,
    createdAt: credential.created_at,
    updatedAt: credential.updated_at
  };
}
