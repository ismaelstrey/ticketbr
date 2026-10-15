import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type StaffSession = {
  userId: string;
  role: "ADMIN" | "AGENT";
  name: string;
  email: string;
};

export async function requireStaffSession(): Promise<StaffSession> {
  const session = await getSession();
  const userId = String((session as any)?.id || (session as any)?.sub || "").trim();
  const role = String((session as any)?.role || "").trim();
  const name = String((session as any)?.name || "").trim();
  const email = String((session as any)?.email || "").trim();

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  if (role !== "ADMIN" && role !== "AGENT") {
    throw new Error("FORBIDDEN");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (user.role !== "ADMIN" && user.role !== "AGENT") {
    throw new Error("FORBIDDEN");
  }

  return {
    userId,
    role,
    name: name || "Usuário",
    email
  };
}

/**
 * Exige sessão de staff com perfil ADMIN.
 * Lança FORBIDDEN quando o usuário autenticado não é administrador.
 */
export async function requireAdminSession(): Promise<StaffSession> {
  const session = await requireStaffSession();
  if (session.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/**
 * Converte erros de sessão (UNAUTHORIZED/FORBIDDEN) na resposta HTTP equivalente.
 */
function authFailureResponse(error: unknown): NextResponse {
  const code = error instanceof Error ? error.message : "";
  const forbidden = code === "FORBIDDEN";
  return NextResponse.json({ error: forbidden ? "Forbidden" : "Unauthorized" }, { status: forbidden ? 403 : 401 });
}

/**
 * Guarda de autorização para rotas de staff (ADMIN ou AGENT).
 * Retorna a resposta 401/403 quando não autorizado, ou null quando a sessão é válida.
 */
export async function guardStaff(): Promise<NextResponse | null> {
  try {
    await requireStaffSession();
    return null;
  } catch (error) {
    return authFailureResponse(error);
  }
}

/**
 * Guarda de autorização para rotas restritas a administradores.
 * Retorna a resposta 401/403 quando não autorizado, ou null quando a sessão é válida.
 */
export async function guardAdmin(): Promise<NextResponse | null> {
  try {
    await requireAdminSession();
    return null;
  } catch (error) {
    return authFailureResponse(error);
  }
}
