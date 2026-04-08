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
