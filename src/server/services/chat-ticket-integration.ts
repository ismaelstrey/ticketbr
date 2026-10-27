import { prisma } from "@/lib/prisma";
import { createChatTicketLinkedEvent } from "@/server/contracts/ticket-chat-events";
import { emitChatEventToN8n } from "@/server/services/n8n-adapter";
import { createTicket } from "@/server/services/ticket-service";
import type { NormalizedInboundResult } from "@/server/services/chat-inbound-normalizer";

type InboundMessage = Extract<NormalizedInboundResult, { kind: "message" }>;

const funcionarioSelect = {
  id: true,
  nome: true,
  telefone: true,
  remoteJid: true,
  whatsappId: true,
  solicitante: {
    select: {
      id: true,
      nome_fantasia: true,
      razao_social: true
    }
  }
} as const;

function onlyDigits(input?: string | null): string {
  return (input ?? "").replace(/\D/g, "");
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Localiza o funcionário (e, portanto, a empresa/Solicitante) a partir do
 * identificador de WhatsApp. Primeiro por igualdade direta (remoteJid,
 * whatsappId ou telefone) e, como fallback, comparando apenas os dígitos —
 * necessário porque o telefone pode estar armazenado formatado.
 */
async function resolveFuncionarioByWaChatId(waChatId: string) {
  const digits = onlyDigits(waChatId);
  const bare = waChatId.split("@")[0];
  const candidates = Array.from(new Set([waChatId, bare, digits, `+${digits}`].filter(Boolean)));

  const exact = await prisma.funcionario.findFirst({
    where: {
      OR: [
        { remoteJid: { in: candidates } },
        { whatsappId: { in: candidates } },
        { telefone: { in: candidates } }
      ]
    },
    select: funcionarioSelect
  });

  if (exact) return exact;
  if (!digits) return null;

  const rows = await prisma.funcionario.findMany({
    where: { solicitante: { status: true } },
    take: 500,
    select: funcionarioSelect
  });

  return (
    rows.find(
      (row) =>
        onlyDigits(row.telefone) === digits ||
        onlyDigits(row.remoteJid) === digits ||
        onlyDigits(row.whatsappId) === digits
    ) ?? null
  );
}

/**
 * Integra uma mensagem inbound do WhatsApp ao sistema de tickets.
 *
 * Regras:
 * - Apenas mensagens recebidas (do cliente) geram ticket; mensagens enviadas
 *   pelo atendente (fromMe) são ignoradas.
 * - Enquanto a conversa estiver aberta (ChatConversation.finalized = false) e
 *   já possuir um ticket vinculado, novas mensagens são anexadas à conversa
 *   existente — nenhum ticket adicional é criado.
 * - Só cria ticket quando o contato é identificado como funcionário de uma
 *   empresa (Solicitante); números desconhecidos permanecem apenas no chat.
 *
 * Retorna o id do ticket vinculado ou null quando nenhuma ação é necessária.
 */
export async function ensureTicketForInboundConversation(
  normalized: InboundMessage
): Promise<string | null> {
  const payload = normalized.payload;

  if (payload.fromMe) return null;

  const conversation = await prisma.chatConversation.findFirst({
    where: {
      contactId: payload.wa_chat_id,
      channel: "whatsapp",
      finalized: false
    },
    orderBy: { closedAt: "desc" }
  });

  if (!conversation) return null;

  // Resolve o ticket vinculado à conversa; se ainda não houver, cria um novo.
  const ticketId = conversation.ticketId ?? (await createTicketForConversation(conversation.id, payload));
  if (!ticketId) return null;

  // Conversa já vinculada a um ticket em aberto: não duplica, apenas registra a mensagem.
  await recordInboundMessageEvent(ticketId, payload);

  return ticketId;
}

async function createTicketForConversation(
  conversationId: string,
  payload: InboundMessage["payload"]
): Promise<string | null> {
  const funcionario = await resolveFuncionarioByWaChatId(payload.wa_chat_id);
  const solicitante = funcionario?.solicitante ?? null;

  // Contato sem empresa vinculada: mantém apenas no chat, sem abrir ticket.
  if (!solicitante) return null;

  const empresaNome = solicitante.nome_fantasia || solicitante.razao_social;
  const contactName = payload.pushName || funcionario?.nome || payload.wa_chat_id;
  const text = payload.message.text || payload.message.caption || "";
  const description = text.trim() || `Mensagem recebida via WhatsApp (${payload.message.type}).`;

  const ticket = await createTicket({
    empresa: empresaNome,
    solicitante: empresaNome,
    solicitanteId: solicitante.id,
    assunto: truncate(`WhatsApp - ${contactName}`, 120),
    descricao: description,
    contato: onlyDigits(payload.wa_chat_id) || null,
    operador: "Sistema"
  });

  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { ticketId: ticket.id }
  });

  await emitChatEventToN8n(
    createChatTicketLinkedEvent({
      ticketId: ticket.id,
      contactId: payload.wa_chat_id,
      channel: "whatsapp",
      conversationId: payload.wa_chat_id,
      actor: { type: "integration", name: "WhatsApp" }
    })
  );

  return ticket.id;
}

/**
 * Registra a mensagem recebida como interação no ticket usando o tipo neutro
 * CHAT_MESSAGE — visível no histórico, mas ignorado pelo cálculo de SLA de
 * resposta (que considera apenas COMMENT/NOTE).
 */
async function recordInboundMessageEvent(ticketId: string, payload: InboundMessage["payload"]) {
  const text = (payload.message.text || payload.message.caption || "").trim();
  const hasMedia = Boolean(payload.message.media?.url);

  await prisma.ticketEvent.create({
    data: {
      ticketId,
      type: "CHAT_MESSAGE",
      title: `WhatsApp • ${payload.message.type}`,
      description: text || (hasMedia ? "Mídia recebida via WhatsApp." : "Mensagem recebida via WhatsApp."),
      author: payload.pushName || "Cliente",
      metadata: {
        channel: "whatsapp",
        waChatId: payload.wa_chat_id,
        waMessageId: payload.wa_message_id,
        messageType: payload.message.type,
        mediaUrl: payload.message.media?.url ?? null
      }
    }
  });
}
