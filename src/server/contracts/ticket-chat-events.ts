import { z } from "zod";

export const TICKET_CHAT_EVENT_SCHEMA_VERSION = "1.0.0" as const;

const IsoDateTimeSchema = z.string().datetime({ offset: true });
const UuidSchema = z.string().uuid();
const ChatChannelSchema = z.enum(["whatsapp", "email"]);
const TicketStatusSchema = z.enum(["TODO", "DOING", "PAUSED", "DONE"]);

export const TicketChatEventTypeSchema = z.enum([
  "chat.message.received",
  "chat.ticket.linked",
  "ticket.created",
  "ticket.status.changed",
]);

export const TicketChatEventCorrelationSchema = z
  .object({
    requestId: z.string().min(1).optional(),
    ticketId: z.string().min(1).optional(),
    conversationId: z.string().min(1).optional(),
    waChatId: z.string().min(1).optional(),
    waMessageId: z.string().min(1).optional(),
  })
  .strict();

export const TicketChatEventActorSchema = z
  .object({
    type: z.enum(["system", "user", "customer", "integration"]),
    id: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
  })
  .strict();

const ChatMessageReceivedDataSchema = z
  .object({
    provider: z.string().min(1),
    mode: z.string().min(1),
    event: z.string().min(1),
    instance: z.string().min(1).nullable(),
    waChatId: z.string().min(1),
    waMessageId: z.string().min(1),
    fromMe: z.boolean(),
    pushName: z.string().nullable(),
    timestamp: z.number().int().nullable(),
    message: z
      .object({
        type: z.string().min(1),
        text: z.string().nullable(),
        caption: z.string().nullable(),
        media: z
          .object({
            url: z.string().min(1),
            mimetype: z.string().min(1),
          })
          .nullable(),
      })
      .strict(),
    raw: z.unknown(),
  })
  .strict();

const ChatTicketLinkedDataSchema = z
  .object({
    ticketId: z.string().min(1),
    contactId: z.string().min(1),
    channel: ChatChannelSchema,
    conversationId: z.string().min(1),
  })
  .strict();

const TicketCreatedDataSchema = z
  .object({
    ticketId: z.string().min(1),
    ticketNumber: z.number().int().positive(),
    status: TicketStatusSchema,
    priority: z.string().min(1).nullable(),
    subject: z.string().min(1),
    company: z.string().nullable(),
  })
  .strict();

const TicketStatusChangedDataSchema = z
  .object({
    ticketId: z.string().min(1),
    fromStatus: TicketStatusSchema.nullable(),
    toStatus: TicketStatusSchema,
    pauseReason: z.string().nullable(),
    pauseSla: z.boolean().optional(),
  })
  .strict();

const TicketChatEventBaseSchema = z
  .object({
    eventId: UuidSchema,
    schemaVersion: z.literal(TICKET_CHAT_EVENT_SCHEMA_VERSION),
    type: TicketChatEventTypeSchema,
    source: z.enum(["ticketbr-chat", "ticketbr-ticket"]),
    occurredAt: IsoDateTimeSchema,
    correlation: TicketChatEventCorrelationSchema.optional(),
    actor: TicketChatEventActorSchema.optional(),
  })
  .strict();

export const ChatMessageReceivedEventSchema = TicketChatEventBaseSchema.extend({
  type: z.literal("chat.message.received"),
  source: z.literal("ticketbr-chat"),
  data: ChatMessageReceivedDataSchema,
}).strict();

export const ChatTicketLinkedEventSchema = TicketChatEventBaseSchema.extend({
  type: z.literal("chat.ticket.linked"),
  source: z.literal("ticketbr-chat"),
  data: ChatTicketLinkedDataSchema,
}).strict();

export const TicketCreatedEventSchema = TicketChatEventBaseSchema.extend({
  type: z.literal("ticket.created"),
  source: z.literal("ticketbr-ticket"),
  data: TicketCreatedDataSchema,
}).strict();

export const TicketStatusChangedEventSchema = TicketChatEventBaseSchema.extend({
  type: z.literal("ticket.status.changed"),
  source: z.literal("ticketbr-ticket"),
  data: TicketStatusChangedDataSchema,
}).strict();

export const CanonicalTicketChatEventSchema = z.discriminatedUnion("type", [
  ChatMessageReceivedEventSchema,
  ChatTicketLinkedEventSchema,
  TicketCreatedEventSchema,
  TicketStatusChangedEventSchema,
]);

export type CanonicalTicketChatEvent = z.infer<typeof CanonicalTicketChatEventSchema>;
export type TicketChatEventType = z.infer<typeof TicketChatEventTypeSchema>;

function buildEventBase<T extends TicketChatEventType>(input: {
  type: T;
  source: "ticketbr-chat" | "ticketbr-ticket";
  occurredAt?: string;
  eventId?: string;
  correlation?: z.input<typeof TicketChatEventCorrelationSchema>;
  actor?: z.input<typeof TicketChatEventActorSchema>;
}) {
  return {
    eventId: input.eventId ?? crypto.randomUUID(),
    schemaVersion: TICKET_CHAT_EVENT_SCHEMA_VERSION,
    type: input.type,
    source: input.source,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    ...(input.correlation ? { correlation: input.correlation } : {}),
    ...(input.actor ? { actor: input.actor } : {}),
  };
}

export function createChatMessageReceivedEvent(input: {
  provider: string;
  mode: string;
  event: string;
  instance: string | null;
  waChatId: string;
  waMessageId: string;
  fromMe: boolean;
  pushName: string | null;
  timestamp: number | null;
  message: {
    type: string;
    text: string | null;
    caption: string | null;
    media: { url: string; mimetype: string } | null;
  };
  raw: unknown;
  occurredAt?: string;
  eventId?: string;
  correlation?: z.input<typeof TicketChatEventCorrelationSchema>;
}) {
  return ChatMessageReceivedEventSchema.parse({
    ...buildEventBase({
      type: "chat.message.received",
      source: "ticketbr-chat",
      occurredAt: input.occurredAt,
      eventId: input.eventId,
      correlation: input.correlation,
    }),
    data: {
      provider: input.provider,
      mode: input.mode,
      event: input.event,
      instance: input.instance,
      waChatId: input.waChatId,
      waMessageId: input.waMessageId,
      fromMe: input.fromMe,
      pushName: input.pushName,
      timestamp: input.timestamp,
      message: input.message,
      raw: input.raw,
    },
  });
}

export function createChatTicketLinkedEvent(input: {
  ticketId: string;
  contactId: string;
  channel: "whatsapp" | "email";
  conversationId: string;
  occurredAt?: string;
  eventId?: string;
  actor?: z.input<typeof TicketChatEventActorSchema>;
  correlation?: z.input<typeof TicketChatEventCorrelationSchema>;
}) {
  return ChatTicketLinkedEventSchema.parse({
    ...buildEventBase({
      type: "chat.ticket.linked",
      source: "ticketbr-chat",
      occurredAt: input.occurredAt,
      eventId: input.eventId,
      actor: input.actor,
      correlation: input.correlation ?? {
        ticketId: input.ticketId,
        conversationId: input.conversationId,
      },
    }),
    data: {
      ticketId: input.ticketId,
      contactId: input.contactId,
      channel: input.channel,
      conversationId: input.conversationId,
    },
  });
}

export function toWebhookDispatchPayload(event: CanonicalTicketChatEvent) {
  return {
    type: event.type,
    source: event.source,
    occurredAt: event.occurredAt,
    schemaVersion: event.schemaVersion,
    eventId: event.eventId,
    ...(event.correlation ? { correlation: event.correlation } : {}),
    ...(event.actor ? { actor: event.actor } : {}),
    data: event.data,
  };
}

export function parseCanonicalTicketChatEvent(input: unknown) {
  return CanonicalTicketChatEventSchema.parse(input);
}
