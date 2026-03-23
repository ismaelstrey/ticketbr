import { describe, expect, it, beforeEach } from "vitest";
import { getPersistedBoolean, setPersistedBoolean } from "./persistedBoolean";

describe("persistedBoolean", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("retorna default quando não existe", () => {
    expect(getPersistedBoolean("k1", false)).toBe(false);
    expect(getPersistedBoolean("k1", true)).toBe(true);
  });

  it("persiste e recupera valor", () => {
    expect(setPersistedBoolean("k2", true)).toBe(true);
    expect(getPersistedBoolean("k2", false)).toBe(true);
    expect(setPersistedBoolean("k2", false)).toBe(true);
    expect(getPersistedBoolean("k2", true)).toBe(false);
  });
});

