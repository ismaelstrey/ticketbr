import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { InventoryTreeQuerySchema } from "@/lib/validations/inventory";
import { requireStaffSession } from "@/server/services/staff-context";
import { buildInventoryTree } from "@/server/services/inventory-tree";

// Retorna a árvore de infraestrutura (host -> VM -> container) de um cliente
export async function GET(request: NextRequest) {
  try {
    await requireStaffSession();

    const parsed = InventoryTreeQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const data = await buildInventoryTree({ solicitanteId: parsed.data.solicitanteId });
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}
