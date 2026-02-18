import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { login } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha obrigatórios" }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // Se o usuário não tiver senha (antigo), falha
    if (!user.password) {
        return NextResponse.json({ error: "Usuário sem senha definida. Contate admin." }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // Login sucesso
    const token = await login({ sub: user.id, email: user.email, role: user.role, name: user.name });

    return NextResponse.json({ 
        message: "Login realizado com sucesso",
        user: { id: user.id, email: user.email, name: user.name, role: user.role } 
    });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
