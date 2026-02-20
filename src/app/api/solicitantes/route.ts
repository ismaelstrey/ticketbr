import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/lib/prisma";
import { CreateSolicitanteSchema } from "@/lib/validations/solicitante";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  sortBy: z.enum(["nome_fantasia", "cnpj", "email", "telefone", "data_cadastro"]).optional().default("data_cadastro"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const { page, pageSize, search, sortBy, sortDir } = parsed.data;
    const q = search.trim();

    const where = q
      ? {
          status: true,
          OR: [
            { nome_fantasia: { contains: q, mode: "insensitive" as const } },
            { cnpj: { contains: q.replace(/\D/g, "") } },
          ],
        }
      : { status: true };

    const [total, data] = await Promise.all([
      prisma.solicitante.count({ where }),
      prisma.solicitante.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ data, total, page, pageSize });
  } catch (error) {
    console.error("Error fetching solicitantes:", error);
    return NextResponse.json({ error: "Failed to fetch solicitantes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = CreateSolicitanteSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Erro de validação", details: z.treeifyError(result.error) }, { status: 400 });
    }

    const solicitante = await prisma.solicitante.create({
      data: {
        razao_social: result.data.nome,
        nome_fantasia: result.data.nome,
        cnpj: result.data.cpfCnpj,
        email: result.data.email,
        telefone: result.data.telefone,
        endereco_completo: result.data.enderecoCompleto,
        status: true,
      },
    });

    return NextResponse.json({ data: solicitante }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "CPF/CNPJ já cadastrado." }, { status: 409 });
    }
    const message = typeof error?.message === "string" ? error.message : "Failed to create solicitante";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
