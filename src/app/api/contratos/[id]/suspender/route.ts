import { NextRequest, NextResponse } from "next/server";
import { suspenderContrato } from "@/server/services/contract-service";
import { requireAdminSession } from "@/server/services/staff-context";
import { contratoErrorResponse } from "../../helpers";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;

    const contrato = await suspenderContrato(id, { id: session.userId });
    return NextResponse.json({ data: contrato });
  } catch (error) {
    return contratoErrorResponse(error);
  }
}
