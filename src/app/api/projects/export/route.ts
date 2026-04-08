import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/server/services/staff-context";
import { ProjectExportSchema, ProjectListQuerySchema } from "../schemas";
import * as XLSX from "xlsx";

function toCsv(rows: Array<Record<string, any>>) {
  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      for (const key of Object.keys(row)) set.add(key);
      return set;
    }, new Set<string>())
  );
  const escape = (value: any) => {
    const s = value === null || value === undefined ? "" : String(value);
    const needs = /[",\n\r]/.test(s);
    const out = s.replaceAll('"', '""');
    return needs ? `"${out}"` : out;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

function baseWhereForSession(session: { userId: string; role: string }) {
  if (session.role === "ADMIN") return {};
  return {
    OR: [{ ownerUserId: session.userId }, { members: { some: { userId: session.userId } } }]
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireStaffSession();
    const body = await request.json().catch(() => ({}));
    const input = ProjectExportSchema.parse(body);

    const query = input.query ? ProjectListQuerySchema.partial().parse(input.query) : {};
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

    const items = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { ownerUser: { select: { id: true, name: true, email: true } }, _count: { select: { members: true } } }
    });

    await prisma.projectExportAudit.create({
      data: {
        userId: session.userId,
        projectId: null,
        format: input.format,
        filters: { query }
      }
    });

    const rows = items.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      owner: p.ownerUser?.name ?? "",
      ownerEmail: p.ownerUser?.email ?? "",
      startDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : "",
      endDate: p.endDate ? p.endDate.toISOString().slice(0, 10) : "",
      membersCount: (p as any)?._count?.members ?? 0,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    }));

    const fileBase = `projetos_${new Date().toISOString().slice(0, 10)}`;

    if (input.format === "json") {
      return NextResponse.json({ data: rows });
    }

    if (input.format === "csv") {
      const csv = toCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"${fileBase}.csv\"`
        }
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Projetos");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"${fileBase}.xlsx\"`
      }
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Bad Request" }, { status });
  }
}
