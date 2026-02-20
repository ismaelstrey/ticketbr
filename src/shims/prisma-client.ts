type TicketStatus = "TODO" | "DOING" | "PAUSED" | "DONE";
type TicketPriority = "HIGH" | "MEDIUM" | "NONE";
type TicketEventType =
  | "CREATED"
  | "STATUS_CHANGED"
  | "PAUSED"
  | "COMMENT"
  | "NOTE"
  | "ASSIGNED"
  | "SLA_UPDATED"
  | "UPDATED";

type TicketRecord = {
  id: string;
  number: number;
  company: string;
  requester: string;
  subject: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  operator?: string;
  contact?: string;
  ticketType?: string;
  category?: string;
  workbench?: string;
  responseSlaAt?: Date;
  solutionSlaAt?: Date;
  pausedReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type EventRecord = {
  id: string;
  ticketId: string;
  type: TicketEventType;
  title: string;
  description?: string;
  fromStatus?: TicketStatus | null;
  toStatus?: TicketStatus | null;
  pauseReason?: string;
  metadata?: unknown;
  author?: string;
  createdAt: Date;
};

const state = {
  tickets: [] as TicketRecord[],
  events: [] as EventRecord[],
  ticketInc: 2380,
  eventInc: 1
};

function cuid(prefix: string, inc: number) {
  return `${prefix}_${inc.toString(36)}_${Date.now().toString(36)}`;
}

function withEvents(ticket: TicketRecord) {
  return {
    ...ticket,
    events: state.events.filter((event) => event.ticketId === ticket.id)
  };
}

export class PrismaClient {
  ticket = {
    findMany: async ({ include, orderBy }: any = {}) => {
      let tickets = [...state.tickets];
      if (orderBy?.createdAt === "desc") {
        tickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return include?.events ? tickets.map(withEvents) : tickets;
    },

    findUnique: async ({ where, include }: any) => {
      const ticket = state.tickets.find((item) => item.id === where.id) ?? null;
      if (!ticket) {
        return null;
      }
      return include?.events ? withEvents(ticket) : ticket;
    },

    create: async ({ data, include }: any) => {
      const id = cuid("ticket", state.ticketInc + 1);
      state.ticketInc += 1;
      const now = new Date();

      const ticket: TicketRecord = {
        id,
        number: state.ticketInc,
        company: data.company,
        requester: data.requester,
        subject: data.subject,
        description: data.description,
        status: data.status ?? "TODO",
        priority: data.priority ?? "NONE",
        operator: data.operator,
        contact: data.contact,
        ticketType: data.ticketType,
        category: data.category,
        workbench: data.workbench,
        pausedReason: data.pausedReason ?? null,
        createdAt: now,
        updatedAt: now
      };

      state.tickets.push(ticket);

      if (data.events?.create) {
        const event = data.events.create;
        state.events.push({
          id: cuid("event", state.eventInc++),
          ticketId: id,
          type: event.type,
          title: event.title,
          description: event.description,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          pauseReason: event.pauseReason,
          metadata: event.metadata,
          author: event.author,
          createdAt: now
        });
      }

      return include?.events ? withEvents(ticket) : ticket;
    },

    update: async ({ where, data, include }: any) => {
      const index = state.tickets.findIndex((item) => item.id === where.id);
      if (index < 0) {
        throw new Error("Ticket not found");
      }

      const current = state.tickets[index];
      const next: TicketRecord = {
        ...current,
        ...data,
        updatedAt: new Date()
      };

      state.tickets[index] = next;
      return include?.events ? withEvents(next) : next;
    },

    delete: async ({ where }: any) => {
      const index = state.tickets.findIndex((item) => item.id === where.id);
      if (index < 0) {
        throw new Error("Ticket not found");
      }
      const [deleted] = state.tickets.splice(index, 1);
      state.events = state.events.filter((event) => event.ticketId !== deleted.id);
      return deleted;
    }
  };

  ticketEvent = {
    create: async ({ data }: any) => {
      const event: EventRecord = {
        id: cuid("event", state.eventInc++),
        ticketId: data.ticketId,
        type: data.type,
        title: data.title,
        description: data.description,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        pauseReason: data.pauseReason,
        metadata: data.metadata,
        author: data.author,
        createdAt: new Date()
      };
      state.events.push(event);
      return event;
    }
  };
}
