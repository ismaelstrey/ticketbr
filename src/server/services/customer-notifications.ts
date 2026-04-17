import { timedCheck } from "@/lib/observability";
import { sendEmail } from "@/server/services/emailer";
import { recordCriticalFlowEvent } from "@/server/services/critical-flow-observability";

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
  const result = await timedCheck(() =>
    sendEmail({
      to: input.to,
      subject: `[TicketBR] Ticket #${input.ticketNumber} criado: ${input.subject}`,
      text: `Empresa: ${input.companyName}\nTicket: #${input.ticketNumber}\nAssunto: ${input.subject}\n\nAcompanhar: ${url}`
    })
  );

  await recordCriticalFlowEvent({
    stage: "customer_update",
    outcome: result.ok ? "success" : "failure",
    action: "ticket_created",
    latencyMs: result.latencyMs,
    statusCode: result.ok ? 200 : 500,
    entityId: input.ticketId,
    metadata: { recipients: input.to.length }
  });

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
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
  const result = await timedCheck(() =>
    sendEmail({
      to: input.to,
      subject: `[TicketBR] Novo comentario no ticket #${input.ticketNumber}: ${input.subject}`,
      text: `Autor: ${input.author}\nTicket: #${input.ticketNumber}\nAssunto: ${input.subject}\n\nMensagem:\n${input.message}\n\nAbrir ticket: ${url}`
    })
  );

  await recordCriticalFlowEvent({
    stage: "customer_update",
    outcome: result.ok ? "success" : "failure",
    action: "ticket_commented",
    latencyMs: result.latencyMs,
    statusCode: result.ok ? 200 : 500,
    entityId: input.ticketId,
    metadata: { recipients: input.to.length }
  });

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}
