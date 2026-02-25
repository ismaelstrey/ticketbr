import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function inferTags(name: string) {
  const tags: string[] = [];
  if (/vip|premium|ouro/i.test(name)) tags.push("VIP");
  if (/internet|net|telecom/i.test(name)) tags.push("ISP");
  if (tags.length === 0) tags.push("Cliente");
  return tags;
}

export async function GET() {
  try {
    const contacts = await prisma.solicitante.findMany({
      where: { status: true },
      orderBy: { nome_fantasia: "asc" },
      select: {
        id: true,
        nome_fantasia: true,
        razao_social: true,
        email: true,
        telefone: true
      }
    });

    return NextResponse.json({
      data: contacts.map((c) => ({
        id: c.id,
        name: c.nome_fantasia,
        company: c.razao_social,
        email: c.email,
        phone: c.telefone,
        tags: inferTags(c.nome_fantasia)
      }))
    });
  } catch (error) {
    console.error("Error loading chat contacts", error);
    return NextResponse.json({ error: "Erro ao carregar contatos" }, { status: 500 });
  }
}
