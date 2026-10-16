import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardStaff } from "@/server/services/staff-context";

export async function GET() {
  // Garante que apenas staff (ADMIN/AGENT) autenticado acesse a lista de atendentes
  const unauthorized = await guardStaff();
  if (unauthorized) return unauthorized;

  try {
    // Lista somente usuários de staff, evitando expor contas de clientes (CUSTOMER)
    const users = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "AGENT"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error("Error fetching chat agents", error);
    return NextResponse.json({ error: "Erro ao carregar atendentes" }, { status: 500 });
  }
}
