import { decryptJson, encryptJson, type EncryptedPayload } from "./encryption";

// Valor exibido no lugar da senha real em listagens e detalhes
export const MASKED_SECRET = "••••••••";

// Resolve a chave usada pelo cofre: usa VAULT_ENCRYPTION_KEY quando definida e,
// na ausência dela, reaproveita STORAGE_SETTINGS_ENCRYPTION_KEY para não quebrar o ambiente.
function resolveVaultKeyEnv(): string {
  const dedicated = String(process.env.VAULT_ENCRYPTION_KEY ?? "").trim();
  return dedicated ? "VAULT_ENCRYPTION_KEY" : "STORAGE_SETTINGS_ENCRYPTION_KEY";
}

// Cifra uma senha em texto puro e devolve o payload pronto para persistir (JSON)
export function encryptSecret(plain: string): EncryptedPayload {
  return encryptJson({ secret: String(plain ?? "") }, { keyEnvVar: resolveVaultKeyEnv() });
}

// Decifra o payload persistido e devolve a senha em texto puro
export function decryptSecret(payload: EncryptedPayload): string {
  const decoded = decryptJson<{ secret?: unknown }>(payload, { keyEnvVar: resolveVaultKeyEnv() });
  return String(decoded?.secret ?? "");
}

// Valida se um valor lido do banco tem o formato de payload cifrado
export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  return raw.alg === "aes-256-gcm" && typeof raw.iv === "string" && typeof raw.tag === "string" && typeof raw.ciphertext === "string";
}
