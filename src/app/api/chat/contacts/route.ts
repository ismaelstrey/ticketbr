import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const contacts = await prisma.solicitante.findMany({
      where: { status: true },
      orderBy: { nome_fantasia: "asc" },
      select: {
        id: true,
        nome_fantasia: true,
        email: true,
        telefone: true
      }
    });

    return NextResponse.json({
      data: contacts.map((c) => ({
        id: c.id,
        name: c.nome_fantasia,
        email: c.email,
        phone: c.telefone
      }))
    });
  } catch (error) {
    console.error("Error loading chat contacts", error);
    return NextResponse.json({ error: "Erro ao carregar contatos" }, { status: 500 });
  }
}
