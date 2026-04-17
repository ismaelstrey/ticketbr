import { NextRequest } from "next/server";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { chatService } from "@/server/services/chat-service";
import { recordCriticalFlowEvent } from "@/server/services/critical-flow-observability";

function normalizeWaChatId(value: string) {
  return value.trim();
}

type AttendanceOutcome = {
  status: number;
  body: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const context = createRequestContext();

  const respond = async (
    outcome: AttendanceOutcome,
    event: {
      outcome: "success" | "failure";
      action: string;
      actorUserId?: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    await recordCriticalFlowEvent({
      stage: "chat_attendance",
      outcome: event.outcome,
      action: event.action,
      latencyMs: Date.now() - context.startedAt,
      statusCode: outcome.status,
      actorUserId: event.actorUserId,
      entityId: event.entityId,
      metadata: event.metadata
    });

    if (event.outcome === "success") {
      logRouteEvent("[chat.attendance] success", "info", context, {
        action: event.action,
        statusCode: outcome.status
      });
    } else {
      logRouteEvent("[chat.attendance] failure", "warn", context, {
        action: event.action,
        statusCode: outcome.status
      });
    }

    return jsonWithRequestId(outcome.body, context, { status: outcome.status });
  };

  try {
    const session = await getSession();
    if (!session?.id) {
      return respond(
        { status: 401, body: { error: "Unauthorized" } },
        { outcome: "failure", action: "unauthorized" }
      );
    }

    const body = await request.json();
    const action = String(body?.action || "").trim();
    const waChatId = normalizeWaChatId(String(body?.waChatId || body?.contactId || ""));
    const currentUserId = String(session.id);
    const currentUserName = String(session.name || "Atendente");

    if (!waChatId || !["claim", "transfer"].includes(action)) {
      return respond(
        { status: 400, body: { error: "waChatId e action validos sao obrigatorios" } },
        { outcome: "failure", action: "validation", actorUserId: currentUserId }
      );
    }

    let conversation = await prisma.conversation.findUnique({ where: { waChatId } });
    if (!conversation && action === "claim") {
      conversation = await chatService.findOrCreateConversation(waChatId);
    }

    if (!conversation) {
      return respond(
        { status: 404, body: { error: "Conversa nao encontrada" } },
        {
          outcome: "failure",
          action,
          actorUserId: currentUserId,
          metadata: { waChatId }
        }
      );
    }

    if (action === "claim") {
      if (conversation.assignedTo && conversation.assignedTo !== currentUserId) {
        const assignedUser = await prisma.user.findUnique({
          where: { id: conversation.assignedTo },
          select: { name: true }
        });
        return respond(
          {
            status: 409,
            body: { error: `Esta conversa ja esta em atendimento por ${assignedUser?.name || "outro atendente"}` }
          },
          {
            outcome: "failure",
            action: "claim",
            actorUserId: currentUserId,
            entityId: conversation.id
          }
        );
      }

      const updated = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          assignedTo: currentUserId,
          humanActive: true,
          botActive: false,
          status: "open"
        }
      });

      return respond(
        {
          status: 200,
          body: {
            data: {
              conversationId: updated.id,
              assignedTo: currentUserId,
              assignedUserName: currentUserName,
              humanActive: updated.humanActive,
              botActive: updated.botActive
            }
          }
        },
        {
          outcome: "success",
          action: "claim",
          actorUserId: currentUserId,
          entityId: updated.id,
          metadata: { waChatId }
        }
      );
    }

    if (conversation.assignedTo !== currentUserId) {
      return respond(
        { status: 403, body: { error: "Apenas o atendente responsavel pode transferir esta conversa" } },
        {
          outcome: "failure",
          action: "transfer",
          actorUserId: currentUserId,
          entityId: conversation.id
        }
      );
    }

    const targetUserId = String(body?.targetUserId || "").trim();
    if (!targetUserId) {
      return respond(
        { status: 400, body: { error: "Selecione o atendente de destino" } },
        {
          outcome: "failure",
          action: "transfer",
          actorUserId: currentUserId,
          entityId: conversation.id
        }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true }
    });

    if (!targetUser) {
      return respond(
        { status: 404, body: { error: "Atendente de destino nao encontrado" } },
        {
          outcome: "failure",
          action: "transfer",
          actorUserId: currentUserId,
          entityId: conversation.id,
          metadata: { targetUserId }
        }
      );
    }

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        assignedTo: targetUser.id,
        humanActive: true,
        botActive: false,
        status: "open"
      }
    });

    return respond(
      {
        status: 200,
        body: {
          data: {
            conversationId: updated.id,
            assignedTo: targetUser.id,
            assignedUserName: targetUser.name,
            humanActive: updated.humanActive,
            botActive: updated.botActive
          }
        }
      },
      {
        outcome: "success",
        action: "transfer",
        actorUserId: currentUserId,
        entityId: updated.id,
        metadata: { targetUserId }
      }
    );
  } catch (error) {
    await recordCriticalFlowEvent({
      stage: "chat_attendance",
      outcome: "failure",
      action: "exception",
      latencyMs: Date.now() - context.startedAt,
      statusCode: 500,
      metadata: { error: error instanceof Error ? error.message : "unknown" }
    });
    console.error("Error handling chat attendance", error);
    logRouteEvent("[chat.attendance] failed", "error", context, {
      error: error instanceof Error ? error.message : "unknown"
    });
    return jsonWithRequestId({ error: "Erro ao atualizar atendimento da conversa" }, context, { status: 500 });
  }
}
