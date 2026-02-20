import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { id } = await params;
    const requester = await prisma.solicitante.update({
      where: { id },
      data: body
    });
    return NextResponse.json(requester);
  } catch (error) {
    console.error("Error updating requester:", error);
    return NextResponse.json({ error: "Failed to update requester" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Soft delete
    await prisma.solicitante.update({
      where: { id },
      data: { status: false, deleted_at: new Date() }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting requester:", error);
    return NextResponse.json({ error: "Failed to delete requester" }, { status: 500 });
  }
}
