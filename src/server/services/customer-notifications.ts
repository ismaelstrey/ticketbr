import { sendEmail } from "@/server/services/emailer";

function resolveAppBaseUrl() {
  return String(process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function notifyTicketCreated(input: {
  to: string[];
  ticketNumber: number;
  subject: string;
  companyName: string;
  ticketId: string;
}) {
  const url = `${resolveAppBaseUrl()}/cliente/tickets/${encodeURIComponent(input.ticketId)}`;
  return sendEmail({
    to: input.to,
    subject: `[TicketBR] Ticket #${input.ticketNumber} criado: ${input.subject}`,
    text: `Empresa: ${input.companyName}\nTicket: #${input.ticketNumber}\nAssunto: ${input.subject}\n\nAcompanhar: ${url}`
  });
}

export async function notifyTicketCommented(input: {
  to: string[];
  ticketNumber: number;
  subject: string;
  author: string;
  message: string;
  ticketId: string;
}) {
  const url = `${resolveAppBaseUrl()}/cliente/tickets/${encodeURIComponent(input.ticketId)}`;
  return sendEmail({
    to: input.to,
    subject: `[TicketBR] Novo comentário no ticket #${input.ticketNumber}: ${input.subject}`,
    text: `Autor: ${input.author}\nTicket: #${input.ticketNumber}\nAssunto: ${input.subject}\n\nMensagem:\n${input.message}\n\nAbrir ticket: ${url}`
  });
}

