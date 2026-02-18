import { NextResponse } from "next/server";
import { getSession, logout } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: session });
}

export async function POST() {
    await logout();
    return NextResponse.json({ message: "Logout realizado" });
}
