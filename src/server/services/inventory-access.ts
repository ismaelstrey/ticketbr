import { prisma } from "@/lib/prisma";

// Sujeito de uma concessão de acesso do cofre
export type GrantLike = {
  subjectType: string;
  subjectId: string | null;
  role: string | null;
  level: string;
};

export type CredentialSubject = {
  ownerUserId: string | null;
  accessPolicy: string;
};

export type CredentialAccessDecision = {
  canView: boolean;
  canReveal: boolean;
  via: string | null;
};

/**
 * Decide, de forma pura, se o usuário pode ver os metadados (canView) e a senha (canReveal) da credencial.
 * Ordem das regras: ADMIN > política STAFF > dono > concessão por usuário > por papel > por grupo.
 */
export function decideCredentialAccess(
  session: { userId: string; role: string },
  credential: CredentialSubject,
  grants: GrantLike[],
  memberGroupIds: Set<string>
): CredentialAccessDecision {
  if (session.role === "ADMIN") {
    return { canView: true, canReveal: true, via: "role:admin" };
  }

  if (credential.accessPolicy === "STAFF") {
    return { canView: true, canReveal: true, via: "policy:staff" };
  }

  if (credential.ownerUserId && credential.ownerUserId === session.userId) {
    return { canView: true, canReveal: true, via: "owner" };
  }

  const hasReveal = (grant: GrantLike) => grant.level === "REVEAL";

  if (grants.some((g) => g.subjectType === "USER" && g.subjectId === session.userId && hasReveal(g))) {
    return { canView: true, canReveal: true, via: "grant:user" };
  }

  if (grants.some((g) => g.subjectType === "ROLE" && g.role === session.role && hasReveal(g))) {
    return { canView: true, canReveal: true, via: "grant:role" };
  }

  if (grants.some((g) => g.subjectType === "GROUP" && g.subjectId && memberGroupIds.has(g.subjectId) && hasReveal(g))) {
    return { canView: true, canReveal: true, via: "grant:group" };
  }

  // Staff sempre enxerga os metadados (rótulo, usuário, protocolo), mas nunca a senha sem permissão
  return { canView: true, canReveal: false, via: null };
}

/**
 * Resolve o acesso a várias credenciais em lote, buscando as concessões e a participação em grupos de uma só vez.
 */
export async function resolveCredentialAccessBatch(
  session: { userId: string; role: string },
  credentials: Array<{ id: string; ownerUserId: string | null; accessPolicy: string }>
): Promise<Map<string, CredentialAccessDecision>> {
  const result = new Map<string, CredentialAccessDecision>();
  if (!credentials.length) return result;

  const grants = await prisma.credentialAccessGrant.findMany({
    where: { credentialId: { in: credentials.map((c) => c.id) } },
    select: { credentialId: true, subjectType: true, subjectId: true, role: true, level: true }
  });

  const groupIds = Array.from(
    new Set(grants.filter((g) => g.subjectType === "GROUP" && g.subjectId).map((g) => String(g.subjectId)))
  );

  const memberGroupIds = new Set<string>();
  if (groupIds.length) {
    const memberships = await prisma.userGroupMember.findMany({
      where: { userId: session.userId, groupId: { in: groupIds } },
      select: { groupId: true }
    });
    memberships.forEach((m) => memberGroupIds.add(m.groupId));
  }

  const grantsByCredential = new Map<string, GrantLike[]>();
  grants.forEach((g) => {
    const list = grantsByCredential.get(g.credentialId) ?? [];
    list.push({ subjectType: g.subjectType, subjectId: g.subjectId, role: g.role, level: g.level });
    grantsByCredential.set(g.credentialId, list);
  });

  credentials.forEach((credential) => {
    result.set(
      credential.id,
      decideCredentialAccess(session, credential, grantsByCredential.get(credential.id) ?? [], memberGroupIds)
    );
  });

  return result;
}

export type GrantDescriptor = {
  id: string;
  subjectType: string;
  subjectId: string | null;
  role: string | null;
  level: string;
  subjectLabel: string;
};

/**
 * Enriquece as concessões com um rótulo legível (nome do usuário, do grupo ou o papel).
 */
export async function describeGrants(
  grants: Array<{ id: string; subjectType: string; subjectId: string | null; role: string | null; level: string }>
): Promise<GrantDescriptor[]> {
  if (!grants.length) return [];

  const userIds = Array.from(
    new Set(grants.filter((g) => g.subjectType === "USER" && g.subjectId).map((g) => String(g.subjectId)))
  );
  const groupIds = Array.from(
    new Set(grants.filter((g) => g.subjectType === "GROUP" && g.subjectId).map((g) => String(g.subjectId)))
  );

  const [users, groups] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
      : Promise.resolve([]),
    groupIds.length
      ? prisma.userGroup.findMany({ where: { id: { in: groupIds } }, select: { id: true, name: true } })
      : Promise.resolve([])
  ]);

  const userLabels = new Map(users.map((u) => [u.id, u.name || u.email]));
  const groupLabels = new Map(groups.map((g) => [g.id, g.name]));

  return grants.map((grant) => {
    let subjectLabel = "";
    if (grant.subjectType === "USER" && grant.subjectId) subjectLabel = userLabels.get(grant.subjectId) ?? "Usuário";
    else if (grant.subjectType === "GROUP" && grant.subjectId) subjectLabel = groupLabels.get(grant.subjectId) ?? "Grupo";
    else if (grant.subjectType === "ROLE") subjectLabel = grant.role === "ADMIN" ? "Administradores" : "Agentes";

    return {
      id: grant.id,
      subjectType: grant.subjectType,
      subjectId: grant.subjectId,
      role: grant.role,
      level: grant.level,
      subjectLabel
    };
  });
}
