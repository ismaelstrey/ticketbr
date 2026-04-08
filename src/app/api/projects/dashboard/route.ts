import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/server/services/staff-context";

export async function GET(_request: NextRequest) {
  try {
    const session = await requireStaffSession();
    const whereBase: any =
      session.role === "ADMIN" ? {} : { OR: [{ ownerUserId: session.userId }, { members: { some: { userId: session.userId } } }] };

    const soon = new Date();
    soon.setDate(soon.getDate() + 7);

    const [total, active, draft, archived, endingSoon, recent] = await Promise.all([
      prisma.project.count({ where: whereBase }),
      prisma.project.count({ where: { ...whereBase, status: "ACTIVE" } }),
      prisma.project.count({ where: { ...whereBase, status: "DRAFT" } }),
      prisma.project.count({ where: { ...whereBase, status: "ARCHIVED" } }),
      prisma.project.count({
        where: {
          ...whereBase,
          status: { in: ["ACTIVE", "DRAFT"] },
          endDate: { not: null, lte: soon }
        }
      }),
      prisma.project.findMany({
        where: whereBase,
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: { id: true, name: true, status: true, updatedAt: true }
      })
    ]);

    return NextResponse.json({
      data: {
        kpis: { total, active, draft, archived, endingSoon },
        recent
      }
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

