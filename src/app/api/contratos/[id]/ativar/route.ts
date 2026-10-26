import { NextRequest, NextResponse } from "next/server";
import { ativarContrato } from "@/server/services/contract-service";
import { requireAdminSession } from "@/server/services/staff-context";
import { contratoErrorResponse } from "../../helpers";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;

    const contrato = await ativarContrato(id, { id: session.userId });
    return NextResponse.json({ data: contrato });
  } catch (error) {
    return contratoErrorResponse(error);
  }
}
