import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardStaff } from "@/server/services/staff-context";

export async function GET() {
  // Somente staff autenticado (ADMIN/AGENT) pode listar solicitantes
  const unauthorized = await guardStaff();
  if (unauthorized) return unauthorized;

  try {
    const requesters = await prisma.solicitante.findMany({
      where: { status: true },
      orderBy: { nome_fantasia: "asc" }
    });
    return NextResponse.json(requesters);
  } catch (error) {
    console.error("Error fetching requesters:", error);
    return NextResponse.json({ error: "Failed to fetch requesters" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Somente staff autenticado (ADMIN/AGENT) pode criar solicitantes
  const unauthorized = await guardStaff();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const requester = await prisma.solicitante.create({
      data: {
        ...body,
        status: true
      }
    });
    return NextResponse.json(requester, { status: 201 });
  } catch (error) {
    console.error("Error creating requester:", error);
    return NextResponse.json({ error: "Failed to create requester" }, { status: 500 });
  }
}
