import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/services/emailer";

// Tempo de validade do token de redefinição de senha (1 hora)
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Gera o hash SHA-256 do token; apenas o hash é persistido no banco
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Resolve a URL base da aplicação para montar o link enviado por e-mail
function resolveAppBaseUrl(): string {
  return String(process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Inicia a recuperação de senha do portal do cliente.
 * Sempre responde de forma genérica para não revelar se o e-mail existe.
 */
export async function requestCustomerPasswordReset(rawEmail: string) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email) {
    return { ok: false as const };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true }
  });

  // Conta inexistente ou que não é de cliente: não gera token nem envia e-mail
  if (!user || String(user.role) !== "CUSTOMER") {
    return { ok: true as const, skipped: true as const };
  }

  // Invalida tokens anteriores que ainda não foram utilizados
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() }
  });

  const token = randomBytes(32).toString("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS)
    }
  });

  const resetUrl = `${resolveAppBaseUrl()}/cliente/redefinir-senha?token=${token}`;

  await sendEmail({
    to: [user.email],
    subject: "[TicketBR] Redefinição de senha",
    text:
      `Olá, ${user.name}.\n\n` +
      "Recebemos um pedido para redefinir a senha da sua conta.\n" +
      `Acesse o link abaixo (válido por 1 hora):\n${resetUrl}\n\n` +
      "Se você não solicitou a redefinição, ignore este e-mail."
  });

  return { ok: true as const };
}

/**
 * Conclui a redefinição de senha a partir do token enviado por e-mail.
 * Valida o hash, a expiração e o uso único do token antes de trocar a senha.
 */
export async function resetCustomerPassword(rawToken: string, newPassword: string) {
  const token = String(rawToken || "").trim();
  if (!token || !newPassword) {
    return { ok: false as const, reason: "INVALID_TOKEN" as const };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      usedAt: true,
      expiresAt: true,
      user: { select: { role: true } }
    }
  });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, reason: "INVALID_TOKEN" as const };
  }

  if (String(record.user?.role) !== "CUSTOMER") {
    return { ok: false as const, reason: "INVALID_TOKEN" as const };
  }

  const passwordHash = await hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: passwordHash }
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    })
  ]);

  return { ok: true as const, userId: record.userId };
}
