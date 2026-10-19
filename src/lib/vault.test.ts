import { beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, isEncryptedPayload, MASKED_SECRET } from "./vault";

describe("vault", () => {
  beforeEach(() => {
    // Define uma chave de 32 bytes em base64 para o cofre
    process.env.STORAGE_SETTINGS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    delete process.env.VAULT_ENCRYPTION_KEY;
  });

  it("cifra e decifra a senha preservando o valor original", () => {
    const payload = encryptSecret("S3nh@-secreta");
    expect(isEncryptedPayload(payload)).toBe(true);
    expect(payload.ciphertext).not.toContain("S3nh@-secreta");
    expect(decryptSecret(payload)).toBe("S3nh@-secreta");
  });

  it("valida o formato do payload cifrado", () => {
    expect(isEncryptedPayload({ alg: "aes-256-gcm", iv: "x", tag: "y", ciphertext: "z" })).toBe(true);
    expect(isEncryptedPayload({ iv: "x" })).toBe(false);
    expect(isEncryptedPayload(null)).toBe(false);
  });

  it("usa VAULT_ENCRYPTION_KEY quando definida", () => {
    process.env.VAULT_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("base64");
    const payload = encryptSecret("chave-dedicada");
    expect(decryptSecret(payload)).toBe("chave-dedicada");
  });

  it("expõe uma máscara fixa para a senha", () => {
    expect(MASKED_SECRET).toHaveLength(8);
  });
});
