import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { InventorySearchQuerySchema } from "@/lib/validations/inventory";
import { requireStaffSession } from "@/server/services/staff-context";
import { searchInventory } from "@/server/services/inventory-search";

// Busca rápida no inventário ("onde está o Zabbix?") com caminho completo do recurso
export async function GET(request: NextRequest) {
  try {
    await requireStaffSession();

    const parsed = InventorySearchQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const data = await searchInventory(parsed.data);
    return NextResponse.json({ data, total: data.length });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Erro interno" : "Não autorizado" }, { status });
  }
}
