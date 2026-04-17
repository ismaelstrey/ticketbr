import { describe, expect, it } from "vitest";
import {
  getPortalStatusCopy,
  getPortalStatusKey,
  getPortalStatusLabel,
  portalStatusCopyMap
} from "./portal-status-taxonomy";

describe("portal-status-taxonomy", () => {
  it("mapeia status DB para chave de taxonomia", () => {
    expect(getPortalStatusKey("TODO")).toBe("REQUEST_RECEIVED");
    expect(getPortalStatusKey("DOING")).toBe("IN_PROGRESS");
    expect(getPortalStatusKey("PAUSED")).toBe("WAITING_CUSTOMER_ACTION");
    expect(getPortalStatusKey("DONE")).toBe("RESOLVED");
  });

  it("aceita status UI em minúsculo", () => {
    expect(getPortalStatusKey("todo")).toBe("REQUEST_RECEIVED");
    expect(getPortalStatusKey("doing")).toBe("IN_PROGRESS");
    expect(getPortalStatusKey("paused")).toBe("WAITING_CUSTOMER_ACTION");
    expect(getPortalStatusKey("done")).toBe("RESOLVED");
  });

  it("retorna cópia completa para status conhecido", () => {
    const copy = getPortalStatusCopy("PAUSED");
    expect(copy).toEqual(portalStatusCopyMap.WAITING_CUSTOMER_ACTION);
  });

  it("retorna fallback para status desconhecido", () => {
    expect(getPortalStatusKey("UNKNOWN")).toBeNull();
    expect(getPortalStatusCopy("UNKNOWN")).toBeNull();
    expect(getPortalStatusLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

