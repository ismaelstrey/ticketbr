import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/server/services/staff-context";

// Projeção segura do usuário: nunca expõe o hash de senha ao cliente
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  whatsappId: true,
  pushName: true,
  profilePicUrl: true,
  instanceId: true
} as const;

export async function GET() {
  // Somente administradores podem listar usuários
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: publicUserSelect
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Somente administradores podem criar usuários
  const unauthorized = await guardAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { password, ...rest } = body;

    const hashedPassword = await bcrypt.hash(password || "mudar123", 10);

    const user = await prisma.user.create({
      data: {
        ...rest,
        password: hashedPassword
      },
      select: publicUserSelect
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
