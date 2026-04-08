import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/server/services/staff-context";

export async function GET() {
  try {
    await requireStaffSession();
    const users = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "AGENT"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true }
    });
    return NextResponse.json({ data: users });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

