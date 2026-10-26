import { Prisma, prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/services/emailer";
import { getNotificationPreferences } from "@/server/services/notification-preferences";
import type { NotificationType } from "../../../prisma/generated/enums";

// Destinatário de uma notificação: pode ter usuário (in-app) e/ou email (canal externo)
export type NotificationRecipient = {
  userId?: string | null;
  email?: string | null;
};

export type DispatchNotificationInput = {
  tipo: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  ticketId?: string | null;
  solicitanteId?: string | null;
  metadata?: Record<string, unknown>;
  // Chave de deduplicação (recebe sufixo do userId); usada por varreduras periódicas
  dedupeKey?: string | null;
  recipients: NotificationRecipient[];
  email?: { subject: string; text: string };
};

export type Audience = {
  userIds: string[];
  emails: string[];
};

// Verifica se o erro é de violação de unicidade (dedupe) do Prisma
function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function normalizeEmails(list: Array<string | null | undefined>): string[] {
  const set = new Set(
    list
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  );
  return Array.from(set);
}

/**
 * Cria notificações in-app e dispara email (best-effort).
 * Respeita as preferências de notificação (canal e tipo) configuradas em /settings.
 * Nunca lança: falhas de persistência/envio são registradas e ignoradas.
 */
export async function dispatchNotification(input: DispatchNotificationInput) {
  const preferences = await getNotificationPreferences();

  // Tipo desabilitado nas preferências: nada é criado nem enviado
  if (preferences.types[input.tipo] === false) {
    return { created: 0, emailed: 0, skipped: true };
  }

  const inAppRecipients = new Map<string, NotificationRecipient>();
  for (const recipient of input.recipients ?? []) {
    const userId = recipient?.userId ? String(recipient.userId) : "";
    if (userId) inAppRecipients.set(userId, recipient);
  }

  let created = 0;

  if (preferences.inAppEnabled) {
    for (const recipient of inAppRecipients.values()) {
      const userId = String(recipient.userId);
      try {
        await prisma.notification.create({
          data: {
            userId,
            ticketId: input.ticketId ?? null,
            solicitante_id: input.solicitanteId ?? null,
            tipo: input.tipo,
            title: input.title,
            body: input.body ?? null,
            link: input.link ?? null,
            metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
            dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${userId}` : null
          }
        });
        created += 1;
      } catch (error) {
        // Duplicata de varredura (dedupe) é esperada; demais erros são apenas logados
        if (!isUniqueConstraintError(error)) {
          console.warn("[notifications] falha ao criar notificação in-app", {
            userId,
            tipo: input.tipo,
            error: error instanceof Error ? error.message : "unknown"
          });
        }
      }
    }
  }

  let emailed = 0;
  if (input.email && preferences.emailEnabled) {
    const to = normalizeEmails((input.recipients ?? []).map((recipient) => recipient?.email));
    if (to.length) {
      try {
        await sendEmail({ to, subject: input.email.subject, text: input.email.text });
        emailed = to.length;
      } catch (error) {
        console.warn("[notifications] falha ao enviar email", {
          tipo: input.tipo,
          error: error instanceof Error ? error.message : "unknown"
        });
      }
    }
  }

  return { created, emailed, skipped: false };
}

/** Resolve a audiência do lado do cliente (membros do solicitante). */
export async function resolveCustomerAudience(solicitanteId: string | null | undefined): Promise<Audience> {
  if (!solicitanteId) return { userIds: [], emails: [] };

  const [solicitante, members] = await Promise.all([
    prisma.solicitante.findUnique({ where: { id: solicitanteId }, select: { email: true } }),
    prisma.funcionario.findMany({
      where: { solicitante_id: solicitanteId },
      select: { userId: true, email: true, user: { select: { email: true } } }
    })
  ]);

  return {
    userIds: members.map((member) => member.userId),
    emails: normalizeEmails([solicitante?.email, ...members.map((member) => member.email || member.user?.email)])
  };
}

/** Resolve a audiência do lado do staff (operador responsável + administradores). */
export async function resolveStaffAudience(operadorEmail?: string | null): Promise<Audience> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true }
  });

  const userIds = admins.map((admin) => admin.id);
  const emails: Array<string | null | undefined> = admins.map((admin) => admin.email);

  if (operadorEmail) {
    const operadorUser = await prisma.user.findFirst({
      where: { email: { equals: operadorEmail, mode: "insensitive" } },
      select: { id: true, email: true }
    });
    if (operadorUser) {
      userIds.push(operadorUser.id);
      emails.push(operadorUser.email);
    }
    emails.push(operadorEmail);
  }

  return { userIds, emails: normalizeEmails(emails) };
}

// Junta os emails da audiência aos destinatários in-app para o canal de email
function mergeEmailRecipients(audience: Audience): NotificationRecipient[] {
  const recipients: NotificationRecipient[] = audience.userIds.map((userId) => ({ userId }));
  for (const email of audience.emails) {
    recipients.push({ email });
  }
  return recipients;
}

/** Carrega o contexto mínimo do ticket usado para montar as notificações. */
async function loadTicketContext(ticketId: string) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      number: true,
      subject: true,
      solicitante_id: true,
      operador_rel: { select: { email: true, nome: true } }
    }
  });
}

/** Notifica o cliente quando o status do ticket muda. */
export async function notifyTicketStatusChanged(input: {
  ticketId: string;
  fromStatus?: string | null;
  toStatus?: string | null;
}) {
  const ticket = await loadTicketContext(input.ticketId);
  if (!ticket) return { created: 0, emailed: 0 };

  const audience = await resolveCustomerAudience(ticket.solicitante_id);
  if (!audience.userIds.length && !audience.emails.length) return { created: 0, emailed: 0 };

  const link = `/cliente/tickets/${encodeURIComponent(ticket.id)}`;
  const statusLabel = input.toStatus ? `"${input.toStatus}"` : "atualizado";

  return dispatchNotification({
    tipo: "TICKET_STATUS_CHANGED",
    title: `Ticket #${ticket.number} ${statusLabel}`,
    body: `O status do ticket "${ticket.subject}" foi alterado.`,
    link,
    ticketId: ticket.id,
    solicitanteId: ticket.solicitante_id ?? null,
    metadata: { fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null },
    recipients: mergeEmailRecipients(audience),
    email: {
      subject: `[TicketBR] Ticket #${ticket.number} atualizado`,
      text: `Ticket: #${ticket.number}\nAssunto: ${ticket.subject}\nStatus: ${input.toStatus ?? "-"}\n\nAcompanhar: ${buildAbsoluteUrl(link)}`
    }
  });
}

/** Notifica novo comentário no ticket (o destino depende da origem). */
export async function notifyTicketComment(input: {
  ticketId: string;
  fromCustomer: boolean;
  author: string;
  message: string;
}) {
  const ticket = await loadTicketContext(input.ticketId);
  if (!ticket) return { created: 0, emailed: 0 };

  const audience = input.fromCustomer
    ? await resolveStaffAudience(ticket.operador_rel?.email ?? null)
    : await resolveCustomerAudience(ticket.solicitante_id);

  if (!audience.userIds.length && !audience.emails.length) return { created: 0, emailed: 0 };

  const link = input.fromCustomer
    ? `/ticket/kanban/${encodeURIComponent(ticket.id)}`
    : `/cliente/tickets/${encodeURIComponent(ticket.id)}`;

  return dispatchNotification({
    tipo: "TICKET_COMMENT",
    title: `Novo comentário no ticket #${ticket.number}`,
    body: `${input.author}: ${input.message.slice(0, 200)}`,
    link,
    ticketId: ticket.id,
    solicitanteId: ticket.solicitante_id ?? null,
    metadata: { fromCustomer: input.fromCustomer },
    recipients: mergeEmailRecipients(audience),
    email: {
      subject: `[TicketBR] Novo comentário no ticket #${ticket.number}`,
      text: `Autor: ${input.author}\nTicket: #${ticket.number}\nAssunto: ${ticket.subject}\n\nMensagem:\n${input.message}\n\nAbrir: ${buildAbsoluteUrl(link)}`
    }
  });
}

/** Notifica o operador responsável quando um ticket é atribuído a ele. */
export async function notifyTicketAssigned(input: { ticketId: string }) {
  const ticket = await loadTicketContext(input.ticketId);
  const operadorEmail = ticket?.operador_rel?.email ?? null;
  if (!ticket || !operadorEmail) return { created: 0, emailed: 0 };

  const link = `/ticket/kanban/${encodeURIComponent(ticket.id)}`;
  const recipients: NotificationRecipient[] = [{ email: operadorEmail }];

  const operadorUser = await prisma.user.findFirst({
    where: { email: { equals: operadorEmail, mode: "insensitive" } },
    select: { id: true }
  });
  if (operadorUser) recipients.push({ userId: operadorUser.id });

  return dispatchNotification({
    tipo: "TICKET_ASSIGNED",
    title: `Ticket #${ticket.number} atribuído a você`,
    body: `Você é o responsável pelo ticket "${ticket.subject}".`,
    link,
    ticketId: ticket.id,
    solicitanteId: ticket.solicitante_id ?? null,
    metadata: { operadorNome: ticket.operador_rel?.nome ?? null },
    recipients,
    email: {
      subject: `[TicketBR] Ticket #${ticket.number} atribuído a você`,
      text: `Ticket: #${ticket.number}\nAssunto: ${ticket.subject}\n\nAbrir: ${buildAbsoluteUrl(link)}`
    }
  });
}

function buildAbsoluteUrl(path: string): string {
  const base = String(process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path}`;
}

/* ------------------------------ Contratos ------------------------------ */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_DIAS_AVISO = [30, 15, 7];

/** Contrato no formato mínimo consumido pelas notificações do ciclo de vida. */
export interface ContratoNotificacaoRef {
  id: string;
  numero: string;
  titulo: string;
  solicitante_id: string | null;
  solicitanteNome?: string | null;
}

/**
 * Audiência de um evento de contrato: staff (in-app + email) e, quando houver,
 * os emails do cliente. O cliente não recebe in-app aqui porque o link aponta
 * para uma tela interna de contratos.
 */
async function resolveContractRecipients(solicitanteId: string | null): Promise<NotificationRecipient[]> {
  const [staff, customer] = await Promise.all([
    resolveStaffAudience(),
    resolveCustomerAudience(solicitanteId)
  ]);

  const audience: Audience = {
    userIds: staff.userIds,
    emails: normalizeEmails([...staff.emails, ...customer.emails])
  };

  return mergeEmailRecipients(audience);
}

/** Nome exibível do cliente do contrato (fantasia > razão social). */
function nomeCliente(ref: ContratoNotificacaoRef): string {
  return String(ref.solicitanteNome || "").trim();
}

/** Avisa staff e cliente que o contrato se aproxima do vencimento (`marco` em dias). */
export async function notifyContractExpiring(input: {
  contrato: ContratoNotificacaoRef;
  diasRestantes: number;
  marco: number;
}) {
  const destinatarios = await resolveContractRecipients(input.contrato.solicitante_id);
  if (!destinatarios.length) return { created: 0, emailed: 0 };

  const link = `/contratos/${encodeURIComponent(input.contrato.id)}`;
  const cliente = nomeCliente(input.contrato);
  const dias = Math.max(input.diasRestantes, 0);
  const titulo = `Contrato ${input.contrato.numero} vence em ${dias} dia(s)`;
  const corpo = `O contrato "${input.contrato.titulo}"${cliente ? ` de ${cliente}` : ""} vence em ${dias} dia(s). Renove para não interromper o serviço.`;

  return dispatchNotification({
    tipo: "CONTRACT_EXPIRING",
    title: titulo,
    body: corpo,
    link,
    solicitanteId: input.contrato.solicitante_id,
    metadata: { contratoId: input.contrato.id, numero: input.contrato.numero, diasRestantes: dias, marco: input.marco },
    dedupeKey: `contract_expiring:${input.contrato.id}:${input.marco}`,
    recipients: destinatarios,
    email: {
      subject: `[TicketBR] ${titulo}`,
      text: `${corpo}\n\nContrato: ${input.contrato.numero}\nVencimento: ${dias} dia(s)\n\nAbrir: ${buildAbsoluteUrl(link)}`
    }
  });
}

/** Avisa que o contrato venceu sem renovação e o serviço foi interrompido. */
export async function notifyContractExpired(input: { contrato: ContratoNotificacaoRef }) {
  const destinatarios = await resolveContractRecipients(input.contrato.solicitante_id);
  if (!destinatarios.length) return { created: 0, emailed: 0 };

  const link = `/contratos/${encodeURIComponent(input.contrato.id)}`;
  const cliente = nomeCliente(input.contrato);
  const titulo = `Contrato ${input.contrato.numero} vencido`;
  const corpo = `O contrato "${input.contrato.titulo}"${cliente ? ` de ${cliente}` : ""} venceu sem renovação. O serviço do cliente está interrompido até a renovação ou um novo contrato.`;

  return dispatchNotification({
    tipo: "CONTRACT_EXPIRED",
    title: titulo,
    body: corpo,
    link,
    solicitanteId: input.contrato.solicitante_id,
    metadata: { contratoId: input.contrato.id, numero: input.contrato.numero },
    dedupeKey: `contract_expired:${input.contrato.id}`,
    recipients: destinatarios,
    email: {
      subject: `[TicketBR] ${titulo}`,
      text: `${corpo}\n\nContrato: ${input.contrato.numero}\n\nAbrir: ${buildAbsoluteUrl(link)}`
    }
  });
}

/** Confirma o cancelamento do contrato e a interrupção do serviço. */
export async function notifyContractCancelled(input: { contrato: ContratoNotificacaoRef; motivo?: string | null }) {
  const destinatarios = await resolveContractRecipients(input.contrato.solicitante_id);
  if (!destinatarios.length) return { created: 0, emailed: 0 };

  const link = `/contratos/${encodeURIComponent(input.contrato.id)}`;
  const cliente = nomeCliente(input.contrato);
  const motivo = String(input.motivo || "").trim();
  const titulo = `Contrato ${input.contrato.numero} cancelado`;
  const corpo = `O contrato "${input.contrato.titulo}"${cliente ? ` de ${cliente}` : ""} foi cancelado. O serviço do cliente está interrompido até a renovação ou um novo contrato.`;

  return dispatchNotification({
    tipo: "CONTRACT_CANCELLED",
    title: titulo,
    body: motivo ? `${corpo} Motivo: ${motivo}` : corpo,
    link,
    solicitanteId: input.contrato.solicitante_id,
    metadata: { contratoId: input.contrato.id, numero: input.contrato.numero, motivo: motivo || null },
    dedupeKey: `contract_cancelled:${input.contrato.id}`,
    recipients: destinatarios,
    email: {
      subject: `[TicketBR] ${titulo}`,
      text: `${corpo}${motivo ? `\nMotivo: ${motivo}` : ""}\n\nAbrir: ${buildAbsoluteUrl(link)}`
    }
  });
}

/**
 * Varre contratos ativos que se aproximam do vencimento e dispara o aviso do
 * marco já cruzado (30/15/7 dias por padrão). Idempotente via dedupeKey.
 */
export async function runContractExpiryScan(now: Date = new Date()) {
  const contratos = await prisma.contrato.findMany({
    where: { status: "ACTIVE", deleted_at: null, fimVigencia: { not: null, gt: now } },
    select: {
      id: true,
      numero: true,
      titulo: true,
      solicitante_id: true,
      fimVigencia: true,
      diasAvisoVencimento: true,
      solicitante: { select: { nome_fantasia: true, razao_social: true } }
    }
  });

  let avisos = 0;

  for (const contrato of contratos) {
    if (!contrato.fimVigencia) continue;

    const diasRestantes = Math.ceil((contrato.fimVigencia.getTime() - now.getTime()) / MS_PER_DAY);
    const marcos = (contrato.diasAvisoVencimento?.length ? contrato.diasAvisoVencimento : DEFAULT_DIAS_AVISO)
      .slice()
      .sort((a, b) => a - b);
    const marco = marcos.find((valor) => diasRestantes <= valor);
    if (!marco) continue;

    const result = await notifyContractExpiring({
      contrato: {
        id: contrato.id,
        numero: contrato.numero,
        titulo: contrato.titulo,
        solicitante_id: contrato.solicitante_id,
        solicitanteNome: contrato.solicitante?.nome_fantasia || contrato.solicitante?.razao_social || null
      },
      diasRestantes,
      marco
    });

    if (result.created > 0 || result.emailed > 0) avisos += 1;
  }

  return { scanned: contratos.length, avisos };
}

/**
 * Varre tickets com SLA de resposta/solução próximos ou estourados e cria
 * notificações para o staff. Idempotente via dedupeKey (pode rodar em cron).
 */
export async function runSlaScan(now: Date = new Date(), warningHours?: number) {
  const parsedWarning = Number(warningHours);
  const hours = Number.isFinite(parsedWarning) && parsedWarning > 0
    ? parsedWarning
    : Number(process.env.SLA_WARNING_HOURS || "4") || 4;
  const warningLimit = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const tickets = await prisma.ticket.findMany({
    where: {
      deleted_at: null,
      status: { not: "DONE" },
      OR: [
        { responseSlaAt: { lte: warningLimit } },
        { solutionSlaAt: { lte: warningLimit } }
      ]
    },
    select: {
      id: true,
      number: true,
      subject: true,
      solicitante_id: true,
      responseSlaAt: true,
      solutionSlaAt: true,
      operador_rel: { select: { email: true, nome: true } }
    },
    orderBy: { createdAt: "asc" },
    take: 500
  });

  let warnings = 0;
  let breached = 0;

  for (const ticket of tickets) {
    const operadorEmail = ticket.operador_rel?.email ?? null;
    const audience = await resolveStaffAudience(operadorEmail);
    if (!audience.userIds.length && !audience.emails.length) continue;

    const fields: Array<{ key: string; label: string; deadline: Date | null }> = [
      { key: "response", label: "resposta", deadline: ticket.responseSlaAt ?? null },
      { key: "solution", label: "solução", deadline: ticket.solutionSlaAt ?? null }
    ];

    for (const field of fields) {
      if (!field.deadline) continue;
      const isBreached = field.deadline.getTime() <= now.getTime();
      const isWarning = !isBreached && field.deadline.getTime() <= warningLimit.getTime();
      if (!isBreached && !isWarning) continue;

      const tipo: NotificationType = isBreached ? "SLA_BREACHED" : "SLA_WARNING";
      const link = `/ticket/kanban/${encodeURIComponent(ticket.id)}`;
      const dedupeKey = `${isBreached ? "sla_breached" : "sla_warning"}:${ticket.id}:${field.key}`;
      const title = isBreached
        ? `SLA de ${field.label} estourado — ticket #${ticket.number}`
        : `SLA de ${field.label} próximo do vencimento — ticket #${ticket.number}`;

      const result = await dispatchNotification({
        tipo,
        title,
        body: `Ticket "${ticket.subject}" • vencimento: ${field.deadline.toISOString()}`,
        link,
        ticketId: ticket.id,
        solicitanteId: ticket.solicitante_id ?? null,
        metadata: { field: field.key, deadline: field.deadline.toISOString() },
        dedupeKey,
        recipients: mergeEmailRecipients(audience)
      });

      if (result.created > 0 || result.emailed > 0) {
        if (isBreached) breached += 1;
        else warnings += 1;
      }
    }
  }

  return { scanned: tickets.length, warnings, breached };
}

/** Lista notificações do usuário com contagem de não lidas. */
export async function listNotifications(userId: string, options: { limit?: number } = {}) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        tipo: true,
        title: true,
        body: true,
        link: true,
        ticketId: true,
        metadata: true,
        readAt: true,
        createdAt: true
      }
    }),
    prisma.notification.count({ where: { userId, readAt: null } })
  ]);

  return { items, unreadCount };
}

/** Marca notificações como lidas (uma específica ou todas) do usuário. */
export async function markNotificationsRead(userId: string, input: { id?: string; all?: boolean }) {
  const readAt = new Date();

  if (input.all) {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt }
    });
    return { updated: result.count };
  }

  if (!input.id) {
    return { updated: 0 };
  }

  const result = await prisma.notification.updateMany({
    where: { id: input.id, userId, readAt: null },
    data: { readAt }
  });
  return { updated: result.count };
}
