import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/server/services/staff-context";
import { ProjectListQuerySchema, ProjectUpsertSchema } from "./schemas";

function parseQuery(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const raw = {
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    ownerUserId: sp.get("ownerUserId") ?? undefined,
    startDateFrom: sp.get("startDateFrom") ?? undefined,
    endDateTo: sp.get("endDateTo") ?? undefined,
    page: sp.get("page") ?? undefined,
    pageSize: sp.get("pageSize") ?? undefined,
    orderBy: sp.get("orderBy") ?? undefined,
    orderDir: sp.get("orderDir") ?? undefined
  };
  return ProjectListQuerySchema.parse(raw);
}

function baseWhereForSession(session: { userId: string; role: string }) {
  if (session.role === "ADMIN") return {};
  return {
    OR: [{ ownerUserId: session.userId }, { members: { some: { userId: session.userId } } }]
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireStaffSession();
    const query = parseQuery(request);

    const where: any = {
      ...baseWhereForSession(session),
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}),
      ...(query.startDateFrom ? { startDate: { gte: new Date(query.startDateFrom) } } : {}),
      ...(query.endDateTo ? { endDate: { lte: new Date(query.endDateTo) } } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;
    const orderBy: any = { [query.orderBy]: query.orderDir };

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          ownerUser: { select: { id: true, name: true, email: true } },
          _count: { select: { members: true } }
        }
      }),
      prisma.project.count({ where })
    ]);

    return NextResponse.json({ data: items, meta: { total, page: query.page, pageSize: query.pageSize } });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Bad Request" }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireStaffSession();
    const body = await request.json().catch(() => ({}));
    const input = ProjectUpsertSchema.parse(body);

    if (input.startDate && input.endDate && new Date(input.endDate) < new Date(input.startDate)) {
      return NextResponse.json({ error: "Data final não pode ser anterior à data inicial" }, { status: 400 });
    }

    const created = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        status: input.status ?? "ACTIVE",
        ownerUserId: session.userId,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        members: {
          create: {
            userId: session.userId,
            role: "owner"
          }
        }
      },
      include: {
        ownerUser: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } }
      }
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Bad Request" }, { status });
  }
}

