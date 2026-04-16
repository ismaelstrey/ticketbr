import { describe, expect, it, beforeEach } from "vitest";
import { encryptJson, decryptJson } from "./encryption";

describe("encryption", () => {
  beforeEach(() => {
    process.env.STORAGE_SETTINGS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("encrypts and decrypts JSON payloads", () => {
    const input = { hello: "world", n: 123, nested: { ok: true } };
    const encrypted = encryptJson(input);
    expect(encrypted.alg).toBe("aes-256-gcm");
    const out = decryptJson<typeof input>(encrypted);
    expect(out).toEqual(input);
  });
});

