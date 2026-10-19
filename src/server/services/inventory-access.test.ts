import { describe, expect, it, vi } from "vitest";

// Mock do Prisma para isolar a função pura de decisão de acesso
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { decideCredentialAccess, type GrantLike } from "./inventory-access";

const admin = { userId: "admin1", role: "ADMIN" };
const agent = { userId: "agent1", role: "AGENT" };

const ownerCredential = { ownerUserId: "agent1", accessPolicy: "OWNER_AND_ADMINS" };
const otherCredential = { ownerUserId: "owner-x", accessPolicy: "OWNER_AND_ADMINS" };

const grant = (overrides: Partial<GrantLike>): GrantLike => ({
  subjectType: "USER",
  subjectId: null,
  role: null,
  level: "REVEAL",
  ...overrides
});

describe("decideCredentialAccess", () => {
  it("administrador sempre pode visualizar a senha", () => {
    const decision = decideCredentialAccess(admin, otherCredential, [], new Set());
    expect(decision.canReveal).toBe(true);
    expect(decision.via).toBe("role:admin");
  });

  it("política STAFF libera a senha para qualquer staff", () => {
    const decision = decideCredentialAccess(agent, { ownerUserId: "outro", accessPolicy: "STAFF" }, [], new Set());
    expect(decision.canReveal).toBe(true);
    expect(decision.via).toBe("policy:staff");
  });

  it("responsável pela credencial pode visualizar a senha", () => {
    const decision = decideCredentialAccess(agent, ownerCredential, [], new Set());
    expect(decision.canReveal).toBe(true);
    expect(decision.via).toBe("owner");
  });

  it("concede revelação por usuário", () => {
    const grants = [grant({ subjectType: "USER", subjectId: "agent1" })];
    const decision = decideCredentialAccess(agent, otherCredential, grants, new Set());
    expect(decision.canReveal).toBe(true);
    expect(decision.via).toBe("grant:user");
  });

  it("concede revelação por papel (agente)", () => {
    const grants = [grant({ subjectType: "ROLE", role: "AGENT" })];
    const decision = decideCredentialAccess(agent, otherCredential, grants, new Set());
    expect(decision.canReveal).toBe(true);
    expect(decision.via).toBe("grant:role");
  });

  it("concede revelação por grupo do qual o usuário participa", () => {
    const grants = [grant({ subjectType: "GROUP", subjectId: "grupo-1" })];
    const decision = decideCredentialAccess(agent, otherCredential, grants, new Set(["grupo-1"]));
    expect(decision.canReveal).toBe(true);
    expect(decision.via).toBe("grant:group");
  });

  it("não concede revelação quando o usuário não pertence ao grupo", () => {
    const grants = [grant({ subjectType: "GROUP", subjectId: "grupo-1" })];
    const decision = decideCredentialAccess(agent, otherCredential, grants, new Set(["outro-grupo"]));
    expect(decision.canReveal).toBe(false);
  });

  it("staff sem concessão enxerga metadados mas nunca a senha", () => {
    const decision = decideCredentialAccess(agent, otherCredential, [], new Set());
    expect(decision.canView).toBe(true);
    expect(decision.canReveal).toBe(false);
    expect(decision.via).toBeNull();
  });

  it("concessão de nível VIEW não libera a senha", () => {
    const grants = [grant({ subjectType: "USER", subjectId: "agent1", level: "VIEW" })];
    const decision = decideCredentialAccess(agent, otherCredential, grants, new Set());
    expect(decision.canReveal).toBe(false);
  });
});
