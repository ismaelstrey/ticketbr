import crypto from "node:crypto";

const DEFAULT_KEY_VERSION = "v1";

export interface EncryptedPayload {
  alg: "aes-256-gcm";
  keyVersion: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

function getKeyMaterial() {
  const raw = String(process.env.STORAGE_SETTINGS_ENCRYPTION_KEY ?? "").trim();
  if (!raw) {
    throw new Error("Missing STORAGE_SETTINGS_ENCRYPTION_KEY");
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new Error("Invalid STORAGE_SETTINGS_ENCRYPTION_KEY (expected base64)");
  }

  if (key.length !== 32) {
    throw new Error("Invalid STORAGE_SETTINGS_ENCRYPTION_KEY length (expected 32 bytes base64)");
  }

  return { key, keyVersion: DEFAULT_KEY_VERSION };
}

export function encryptJson(value: unknown): EncryptedPayload {
  const { key, keyVersion } = getKeyMaterial();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    alg: "aes-256-gcm",
    keyVersion,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}

export function decryptJson<T>(payload: EncryptedPayload): T {
  if (!payload || payload.alg !== "aes-256-gcm") {
    throw new Error("Unsupported encryption payload");
  }

  const { key } = getKeyMaterial();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

