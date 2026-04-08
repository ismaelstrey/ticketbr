import { NextRequest, NextResponse } from "next/server";
import { Prisma, prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireStaffSession } from "@/server/services/staff-context";

const TaskPrioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
const TaskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "DONE"]);

const CreateTaskSchema = z.object({
  title: z.string().min(2).max(180),
  description: z.string().max(50_000).optional().nullable(),
  priority: TaskPrioritySchema.optional(),
  status: TaskStatusSchema.optional(),
  dueAt: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  ticketIds: z.array(z.string().min(1)).optional()
});

export async function GET(request: NextRequest) {
  try {
    await requireStaffSession();

    const q = String(request.nextUrl.searchParams.get("q") || "").trim();
    const status = String(request.nextUrl.searchParams.get("status") || "").trim();
    const priority = String(request.nextUrl.searchParams.get("priority") || "").trim();
    const assigneeId = String(request.nextUrl.searchParams.get("assigneeId") || "").trim();
    const dueFrom = String(request.nextUrl.searchParams.get("dueFrom") || "").trim();
    const dueTo = String(request.nextUrl.searchParams.get("dueTo") || "").trim();
    const overdue = String(request.nextUrl.searchParams.get("overdue") || "").trim();
    const ticketId = String(request.nextUrl.searchParams.get("ticketId") || "").trim();

    const where: any = {};

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (dueFrom || dueTo) {
      where.dueAt = {
        ...(dueFrom ? { gte: new Date(dueFrom) } : {}),
        ...(dueTo ? { lte: new Date(dueTo) } : {})
      };
    }

    if (overdue === "true") {
      where.dueAt = { ...(where.dueAt || {}), lt: new Date() };
      where.status = { not: "DONE" };
    }

    if (ticketId) {
      where.ticketLinks = { some: { ticketId } };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        ticketLinks: { select: { id: true, ticketId: true } },
        subtasks: { select: { id: true, isDone: true } }
      }
    });

    return NextResponse.json({ data: tasks });
  } catch (error: any) {
    const code = String(error?.message || "");
    if (code === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[tasks] GET failed", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireStaffSession();
    const body = await request.json().catch(() => ({}));
    const input = CreateTaskSchema.parse(body);

    const dueAt = input.dueAt ? new Date(input.dueAt) : null;
    const status = input.status || "PENDING";
    const completedAt = status === "DONE" ? new Date() : null;

    const last = await prisma.task.findFirst({
      where: { status },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true }
    });

    const nextOrder = (last?.sortOrder ?? 0) + 1000;

    const uniqueTicketIds = Array.from(
      new Set((input.ticketIds || []).map((v) => String(v).trim()).filter(Boolean))
    );

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        priority: input.priority || "MEDIUM",
        status,
        dueAt,
        completedAt,
        assigneeId: input.assigneeId ?? null,
        createdById: session.userId,
        sortOrder: nextOrder,
        ticketLinks: uniqueTicketIds.length
          ? { create: uniqueTicketIds.map((ticketId) => ({ ticketId })) }
          : undefined
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        ticketLinks: { select: { id: true, ticketId: true } },
        subtasks: { select: { id: true, isDone: true } }
      }
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.flatten() }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Conflito de dados" }, { status: 409 });
      }
      if (error.code === "P2003") {
        return NextResponse.json({ error: "Responsável inválido" }, { status: 400 });
      }
      if (error.code === "P2021") {
        return NextResponse.json(
          { error: "Banco de dados sem migrations. Rode npm run db:migrate" },
          { status: 500 }
        );
      }
    }

    const rawMessage = String(error?.message || "");
    if (/P1001|Can't reach database server|ECONNREFUSED|connect ECONNREFUSED/i.test(rawMessage)) {
      return NextResponse.json(
        { error: "Banco de dados indisponível. Verifique DATABASE_URL e se o Postgres está rodando." },
        { status: 503 }
      );
    }

    const code = rawMessage;
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    if (status === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status });
    }
    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status });
    }
    console.error("[tasks] POST failed", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
