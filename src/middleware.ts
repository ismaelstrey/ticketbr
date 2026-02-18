import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = process.env.JWT_SECRET || "super-secret-key-change-me";
const key = new TextEncoder().encode(SECRET_KEY);

async function verify(token: string) {
    try {
        await jwtVerify(token, key);
        return true;
    } catch {
        return false;
    }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar arquivos estáticos e imagens
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Rotas públicas
  if (pathname === "/login" || pathname === "/api/auth/login") {
      return NextResponse.next();
  }

  // Verificar Token
  const token = request.cookies.get("token")?.value;
  const isAuthenticated = token && (await verify(token));

  // Proteção de API
  if (pathname.startsWith("/api/")) {
      if (!isAuthenticated) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.next();
  }

  // Proteção de Páginas (Frontend)
  if (!isAuthenticated && pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url));
  }

  // Se logado e tentar acessar login, redireciona para home
  if (isAuthenticated && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
