import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { fakerPT_BR as faker } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";
import { PrismaClient, Role, TicketEventType, TicketPriority, TicketStatus } from "./generated/client";

function resolveConnectionString() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required");
  return value;
}

function createSeedPrismaClient(connectionString: string) {
  const hostname = (() => {
    try {
      return new URL(connectionString).hostname;
    } catch {
      return "";
    }
  })();

  return hostname.endsWith("prisma.io")
    ? new PrismaClient({ adapter: new PrismaPostgresAdapter({ connectionString }) } as any)
    : new PrismaClient({ adapter: new PrismaPg({ connectionString }) } as any);
}

function isMainModule() {
  try {
    const self = path.resolve(fileURLToPath(import.meta.url));
    const invoked = path.resolve(process.argv[1] || "");
    return Boolean(invoked) && self === invoked;
  } catch {
    return false;
  }
}

type SeedSummary = {
  users: number;
  agents: number;
  solicitantes: number;
  funcionarios: number;
  tickets: number;
  ticketEvents: number;
  conversations: number;
  messages: number;
  chatConversations: number;
  tasks: number;
  taskSubtasks: number;
  taskAttachments: number;
  taskTicketLinks: number;
  auditLogs: number;
};

type SeedCounts = {
  solicitantes: number;
  customersPerSolicitante: number;
  agents: number;
  ticketsPerSolicitante: number;
  ticketEventsPerTicket: number;
  conversations: number;
  messagesPerConversation: number;
  tasks: number;
  subtasksPerTask: number;
  attachmentsPerTask: number;
  ticketLinksPerTask: number;
};

type SeedOptions = {
  reset?: boolean;
  seed?: number;
  counts?: Partial<SeedCounts>;
  verbose?: boolean;
};

function parseIntEnv(name: string, fallback: number) {
  const raw = String(process.env[name] ?? "").trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function parseBoolEnv(name: string, fallback: boolean) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

function resolveSeedOptions(options?: SeedOptions): Required<SeedOptions> & { counts: SeedCounts } {
  const defaults: SeedCounts = {
    solicitantes: 6,
    customersPerSolicitante: 4,
    agents: 4,
    ticketsPerSolicitante: 18,
    ticketEventsPerTicket: 3,
    conversations: 12,
    messagesPerConversation: 8,
    tasks: 80,
    subtasksPerTask: 4,
    attachmentsPerTask: 1,
    ticketLinksPerTask: 2
  };

  const resolvedCounts: SeedCounts = {
    solicitantes: parseIntEnv("SEED_SOLICITANTES", options?.counts?.solicitantes ?? defaults.solicitantes),
    customersPerSolicitante: parseIntEnv(
      "SEED_CUSTOMERS_PER_SOLICITANTE",
      options?.counts?.customersPerSolicitante ?? defaults.customersPerSolicitante
    ),
    agents: parseIntEnv("SEED_AGENTS", options?.counts?.agents ?? defaults.agents),
    ticketsPerSolicitante: parseIntEnv(
      "SEED_TICKETS_PER_SOLICITANTE",
      options?.counts?.ticketsPerSolicitante ?? defaults.ticketsPerSolicitante
    ),
    ticketEventsPerTicket: parseIntEnv(
      "SEED_TICKET_EVENTS_PER_TICKET",
      options?.counts?.ticketEventsPerTicket ?? defaults.ticketEventsPerTicket
    ),
    conversations: parseIntEnv("SEED_CONVERSATIONS", options?.counts?.conversations ?? defaults.conversations),
    messagesPerConversation: parseIntEnv(
      "SEED_MESSAGES_PER_CONVERSATION",
      options?.counts?.messagesPerConversation ?? defaults.messagesPerConversation
    ),
    tasks: parseIntEnv("SEED_TASKS", options?.counts?.tasks ?? defaults.tasks),
    subtasksPerTask: parseIntEnv("SEED_SUBTASKS_PER_TASK", options?.counts?.subtasksPerTask ?? defaults.subtasksPerTask),
    attachmentsPerTask: parseIntEnv(
      "SEED_ATTACHMENTS_PER_TASK",
      options?.counts?.attachmentsPerTask ?? defaults.attachmentsPerTask
    ),
    ticketLinksPerTask: parseIntEnv(
      "SEED_TICKET_LINKS_PER_TASK",
      options?.counts?.ticketLinksPerTask ?? defaults.ticketLinksPerTask
    )
  };

  const reset = options?.reset ?? parseBoolEnv("SEED_RESET", process.env.NODE_ENV !== "production");
  const seed = options?.seed ?? parseIntEnv("SEED_RANDOM_SEED", 1337);
  const verbose = options?.verbose ?? parseBoolEnv("SEED_VERBOSE", true);

  return {
    reset,
    seed,
    verbose,
    counts: resolvedCounts
  };
}

function seedLog(enabled: boolean, ...args: any[]) {
  if (!enabled) return;
  const ts = new Date().toISOString();
  console.log(`[seed ${ts}]`, ...args);
}

function makeSeedEmail(localPart: string) {
  return `${localPart}@seed.ticketbr.local`;
}

function makeSeedSubject(subject: string) {
  return `[SEED] ${subject}`;
}

function randomCnpj(used: Set<string>) {
  for (let i = 0; i < 2000; i += 1) {
    const candidate = faker.string.numeric({ length: 14 });
    if (candidate.length === 14 && !used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  throw new Error("Falha ao gerar CNPJ único");
}

function randomWhatsAppId(used: Set<string>) {
  for (let i = 0; i < 2000; i += 1) {
    const ddd = faker.number.int({ min: 11, max: 99 });
    const number = `${faker.number.int({ min: 90000, max: 99999 })}${faker.number.int({ min: 0, max: 9999 })}`.padStart(9, "0");
    const id = `55${ddd}${number}@s.whatsapp.net`;
    if (!used.has(id)) {
      used.add(id);
      return id;
    }
  }
  throw new Error("Falha ao gerar WhatsApp ID único");
}

async function cleanupSeedData(prisma: PrismaClient, verbose: boolean) {
  seedLog(verbose, "cleanup: start");

  await prisma.task.deleteMany({
    where: {
      title: {
        startsWith: "[SEED]"
      }
    }
  });

  await prisma.chatConversation.deleteMany({
    where: {
      OR: [{ conversationId: { startsWith: "seed:" } }, { createdBy: "Seed" }]
    }
  });

  await prisma.conversation.deleteMany({
    where: {
      waChatId: { startsWith: "seed:" }
    }
  });

  await prisma.ticket.deleteMany({
    where: {
      subject: { startsWith: "[SEED]" }
    }
  });

  await prisma.auditLog.deleteMany({
    where: {
      action: { startsWith: "SEED_" }
    }
  });

  await prisma.user.deleteMany({
    where: {
      email: { endsWith: "@seed.ticketbr.local" },
      NOT: { email: "admin@ticketbr.com" }
    }
  });

  await prisma.operador.deleteMany({
    where: {
      OR: [{ email: { endsWith: "@seed.ticketbr.local" } }, { matricula: { startsWith: "SEED" } }]
    }
  });

  await prisma.solicitante.deleteMany({
    where: {
      email: { endsWith: "@seed.ticketbr.local" }
    }
  });

  seedLog(verbose, "cleanup: done");
}

export async function seedDatabase(prisma: PrismaClient, options?: SeedOptions): Promise<SeedSummary> {
  const resolved = resolveSeedOptions(options);
  faker.seed(resolved.seed);

  const summary: SeedSummary = {
    users: 0,
    agents: 0,
    solicitantes: 0,
    funcionarios: 0,
    tickets: 0,
    ticketEvents: 0,
    conversations: 0,
    messages: 0,
    chatConversations: 0,
    tasks: 0,
    taskSubtasks: 0,
    taskAttachments: 0,
    taskTicketLinks: 0,
    auditLogs: 0
  };

  const startedAt = Date.now();
  seedLog(resolved.verbose, "start", { reset: resolved.reset, seed: resolved.seed, counts: resolved.counts });

  const hashedAdminPassword = await bcrypt.hash("admin123", 10);
  const hashedCustomerPassword = await bcrypt.hash("func123", 10);
  const hashedAgentPassword = await bcrypt.hash("agent123", 10);

  const ticketTypes = [
    {
      nome: "Incidente",
      descricao: "Interrupção não planejada de um serviço ou redução na qualidade do serviço.",
      sla_horas: 24,
      prioridade_default: "Alta"
    },
    {
      nome: "Solicitação de Serviço",
      descricao: "Pedido de um usuário para informações, conselhos, uma mudança padrão ou acesso a um serviço.",
      sla_horas: 48,
      prioridade_default: "Média"
    },
    {
      nome: "Problema",
      descricao: "Causa raiz de um ou mais incidentes.",
      sla_horas: 72,
      prioridade_default: "Média"
    },
    {
      nome: "Mudança",
      descricao: "Adição, modificação ou remoção de qualquer coisa que possa ter efeito nos serviços de TI.",
      sla_horas: 120,
      prioridade_default: "Baixa"
    }
  ] as const;

  const categoryByType: Record<string, string[]> = {
    Incidente: ["Hardware", "Software", "Rede", "Segurança"],
    "Solicitação de Serviço": ["Acesso", "Instalação", "Dúvida", "Equipamento"],
    Problema: ["Recorrente", "Performance", "Integridade"],
    Mudança: ["Infraestrutura", "Aplicação", "Processo"]
  };

  const baseRequesters = [
    {
      razao_social: "Empresa A Ltda",
      nome_fantasia: "Empresa A",
      cnpj: "12345678000100",
      email: "contato@empresaa.com",
      telefone: "11999990001",
      endereco_completo: "Rua A, 100, SP"
    },
    {
      razao_social: "Comércio B S.A.",
      nome_fantasia: "Comércio B",
      cnpj: "98765432000199",
      email: "suporte@comerciob.com",
      telefone: "21988880002",
      endereco_completo: "Av B, 200, RJ"
    },
    {
      razao_social: "Tech Solutions",
      nome_fantasia: "Tech Sol",
      cnpj: "11223344000155",
      email: "ti@techsol.com",
      telefone: "31977770003",
      endereco_completo: "Rua C, 300, MG"
    }
  ] as const;

  const createdTypes = new Map<string, { id: string; nome: string }>();

  await prisma.$transaction(
    async (tx) => {
    if (resolved.reset) {
      await cleanupSeedData(tx as any, resolved.verbose);
    }

    for (const t of ticketTypes) {
      const type = await tx.tipo_Ticket.upsert({
      where: { nome: t.nome },
      update: {
        descricao: t.descricao,
        sla_horas: t.sla_horas,
        prioridade_default: t.prioridade_default
      },
      create: t
      });
      createdTypes.set(t.nome, { id: type.id, nome: type.nome });

      const categories = categoryByType[t.nome] || [];
      for (const name of categories) {
        await tx.categoria_Ticket.upsert({
          where: {
            tipo_ticket_id_nome: {
              tipo_ticket_id: type.id,
              nome: name
            }
          },
          update: {
            descricao: `Categoria ${name} para ${t.nome}`
          },
          create: {
            nome: name,
            descricao: `Categoria ${name} para ${t.nome}`,
            tipo_ticket_id: type.id
          }
        });
      }
    }

    const adminUser = await tx.user.upsert({
      where: { email: "admin@ticketbr.com" },
      update: { password: hashedAdminPassword, role: Role.ADMIN, name: "Admin" },
      create: {
        email: "admin@ticketbr.com",
        name: "Admin",
        password: hashedAdminPassword,
        role: Role.ADMIN
      }
    });
    summary.users += 1;

    const admin = await tx.operador.upsert({
      where: { email: "admin@ticketbr.com" },
      update: {
        senha_hash: hashedAdminPassword,
        nome: "Administrador",
        perfil: "Admin",
        is_tecnico: true,
        is_active: true,
        especialidade: "Geral"
      },
      create: {
        nome: "Administrador",
        email: "admin@ticketbr.com",
        senha_hash: hashedAdminPassword,
        matricula: "ADM001",
        perfil: "Admin",
        is_tecnico: true,
        is_active: true,
        especialidade: "Geral"
      }
    });

    const mesa = await tx.mesa_Trabalho.upsert({
      where: { id: "mesa-n1-default" },
      update: { responsavel_id: admin.id, nome: "Nível 1 - Geral", localizacao: "Matriz - 1º Andar", capacidade: 10, tipo: "N1" },
      create: {
        id: "mesa-n1-default",
        nome: "Nível 1 - Geral",
        localizacao: "Matriz - 1º Andar",
        capacidade: 10,
        tipo: "N1",
        responsavel_id: admin.id
      }
    });

    const staffUsers: Array<{ id: string; email: string; name: string; role: Role }> = [
      { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role }
    ];

    for (let i = 0; i < Math.max(0, resolved.counts.agents); i += 1) {
      const email = makeSeedEmail(`agent.${i + 1}`);
      const user = await tx.user.upsert({
        where: { email },
        update: { password: hashedAgentPassword, role: Role.AGENT, name: faker.person.fullName() },
        create: { email, password: hashedAgentPassword, role: Role.AGENT, name: faker.person.fullName() }
      });
      staffUsers.push({ id: user.id, email: user.email, name: user.name, role: user.role });
      summary.users += 1;
      summary.agents += 1;

      await tx.operador.upsert({
        where: { email },
        update: {
          senha_hash: hashedAgentPassword,
          nome: user.name,
          perfil: "Agente",
          is_tecnico: true,
          is_active: true,
          especialidade: faker.helpers.arrayElement(["Redes", "Infra", "Sistemas", "Suporte"]) 
        },
        create: {
          nome: user.name,
          email,
          senha_hash: hashedAgentPassword,
          matricula: `SEED${String(i + 1).padStart(3, "0")}`,
          perfil: "Agente",
          is_tecnico: true,
          is_active: true,
          especialidade: faker.helpers.arrayElement(["Redes", "Infra", "Sistemas", "Suporte"]) 
        }
      });
    }

    const usedCnpjs = new Set<string>(baseRequesters.map((r) => r.cnpj));
    const usedWhatsAppIds = new Set<string>();

    const createdRequesters: Array<{ id: string; nome_fantasia: string; razao_social: string; email: string; telefone: string }> = [];
    for (const r of baseRequesters) {
      const req = await tx.solicitante.upsert({
        where: { cnpj: r.cnpj },
        update: {
          razao_social: r.razao_social,
          nome_fantasia: r.nome_fantasia,
          email: r.email,
          telefone: r.telefone,
          endereco_completo: r.endereco_completo,
          status: true
        },
        create: { ...r }
      });
      createdRequesters.push({
        id: req.id,
        nome_fantasia: req.nome_fantasia,
        razao_social: req.razao_social,
        email: req.email,
        telefone: req.telefone
      });
    }

    for (let i = 0; i < Math.max(0, resolved.counts.solicitantes); i += 1) {
      const cnpj = randomCnpj(usedCnpjs);
      const nomeFantasia = faker.company.name();
      const req = await tx.solicitante.upsert({
        where: { cnpj },
        update: {
          razao_social: `${nomeFantasia} LTDA`,
          nome_fantasia: nomeFantasia,
          email: makeSeedEmail(`contato.${i + 1}`),
          telefone: faker.phone.number(),
          endereco_completo: `${faker.location.streetAddress()}, ${faker.location.city()} - ${faker.location.state({ abbreviated: true })}`,
          status: true,
          updated_by: "seed"
        },
        create: {
          razao_social: `${nomeFantasia} LTDA`,
          nome_fantasia: nomeFantasia,
          cnpj,
          email: makeSeedEmail(`contato.${i + 1}`),
          telefone: faker.phone.number(),
          endereco_completo: `${faker.location.streetAddress()}, ${faker.location.city()} - ${faker.location.state({ abbreviated: true })}`,
          created_by: "seed"
        }
      });
      createdRequesters.push({
        id: req.id,
        nome_fantasia: req.nome_fantasia,
        razao_social: req.razao_social,
        email: req.email,
        telefone: req.telefone
      });
    }

    summary.solicitantes = createdRequesters.length;

    const createdTickets: Array<{ id: string; number: number; subject: string; solicitanteId: string }> = [];

    const allCategories = await tx.categoria_Ticket.findMany({ select: { id: true, nome: true, tipo_ticket_id: true } });

    const ticketStatuses = [TicketStatus.TODO, TicketStatus.DOING, TicketStatus.PAUSED, TicketStatus.DONE] as const;
    const ticketPriorities = [TicketPriority.HIGH, TicketPriority.MEDIUM, TicketPriority.NONE] as const;
    const typeList = Array.from(createdTypes.values());

    for (const requester of createdRequesters) {
      for (let i = 0; i < Math.max(0, resolved.counts.ticketsPerSolicitante); i += 1) {
        const type = faker.helpers.arrayElement(typeList);
        const categoriesForType = allCategories.filter((c) => c.tipo_ticket_id === type.id);
        const category = faker.helpers.arrayElement(categoriesForType);

        const subject = makeSeedSubject(`${faker.hacker.verb()} ${faker.hacker.noun()} em ${requester.nome_fantasia}`);
        if (!resolved.reset) {
          const existing = await tx.ticket.findFirst({ where: { solicitante_id: requester.id, subject } });
          if (existing) {
            createdTickets.push({ id: existing.id, number: existing.number, subject: existing.subject, solicitanteId: requester.id });
            continue;
          }
        }

        const createdBy = faker.helpers.arrayElement(staffUsers);
        const operator = faker.helpers.arrayElement(staffUsers);

        const ticket = await tx.ticket.create({
          data: {
            subject,
            description: faker.lorem.paragraphs({ min: 1, max: 2 }),
            status: faker.helpers.arrayElement(ticketStatuses),
            priority: faker.helpers.arrayElement(ticketPriorities),
            solicitante_id: requester.id,
            tipo_ticket_id: type.id,
            categoria_id: category?.id ?? undefined,
            mesa_trabalho_id: mesa.id,
            operador_id: admin.id,
            requester: requester.nome_fantasia,
            company: requester.nome_fantasia,
            operator: operator.name,
            createdByUserId: createdBy.id,
            ticketType: type.nome,
            category: category?.nome,
            workbench: mesa.nome,
            created_by: "seed",
            updated_by: "seed"
          }
        });
        createdTickets.push({ id: ticket.id, number: ticket.number, subject: ticket.subject, solicitanteId: requester.id });
        summary.tickets += 1;

        await tx.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            type: TicketEventType.CREATED,
            title: "Ticket Criado",
            description: "Ticket criado via Seed",
            author: "Seed",
            authorId: createdBy.id,
            metadata: { seed: true }
          }
        });
        summary.ticketEvents += 1;

        await tx.auditLog.create({
          data: {
            solicitanteId: requester.id,
            actorUserId: createdBy.id,
            action: "SEED_TICKET_CREATED",
            entity: "Ticket",
            entityId: ticket.id,
            metadata: { seed: true }
          }
        });
        summary.auditLogs += 1;

        for (let e = 0; e < Math.max(0, resolved.counts.ticketEventsPerTicket); e += 1) {
          const eventType = faker.helpers.arrayElement([TicketEventType.NOTE, TicketEventType.COMMENT, TicketEventType.UPDATED]);
          await tx.ticketEvent.create({
            data: {
              ticketId: ticket.id,
              type: eventType,
              title: eventType === TicketEventType.COMMENT ? "Comentário" : "Atualização",
              description:
                eventType === TicketEventType.COMMENT
                  ? faker.lorem.sentences({ min: 1, max: 2 })
                  : faker.lorem.sentence(),
              author: "Seed",
              authorId: faker.helpers.arrayElement(staffUsers).id,
              metadata: { seed: true }
            }
          });
          summary.ticketEvents += 1;
        }
      }
    }

    const createdWhatsAppContacts: Array<{ id: string; remoteJid: string; pushName: string; profilePicUrl: string | null }> = [];

    const allCustomers: Array<{ userId: string; solicitanteId: string; name: string; email: string; whatsappId: string | null }> = [];

    for (const requester of createdRequesters) {
      for (let i = 0; i < Math.max(0, resolved.counts.customersPerSolicitante); i += 1) {
        const personName = faker.person.fullName();
        const email = makeSeedEmail(`cliente.${requester.id}.${i + 1}`);
        const waId = randomWhatsAppId(usedWhatsAppIds);
        const profile = faker.image.avatar();

        const contact = await tx.whatsAppContact.upsert({
          where: { id: waId },
          update: {
            remoteJid: waId,
            pushName: personName,
            profilePicUrl: profile,
            instanceId: "default",
            updatedAt: new Date(),
            syncedAt: new Date()
          },
          create: {
            id: waId,
            remoteJid: waId,
            pushName: personName,
            profilePicUrl: profile,
            instanceId: "default",
            createdAt: new Date(),
            updatedAt: new Date(),
            syncedAt: new Date()
          }
        });
        createdWhatsAppContacts.push({ id: contact.id, remoteJid: contact.remoteJid, pushName: contact.pushName || personName, profilePicUrl: contact.profilePicUrl ?? null });

        const customer = await tx.user.upsert({
          where: { email },
          update: {
            password: hashedCustomerPassword,
            role: Role.CUSTOMER,
            name: personName,
            whatsappId: contact.id,
            remoteJid: contact.remoteJid,
            pushName: contact.pushName
          },
          create: {
            email,
            name: personName,
            password: hashedCustomerPassword,
            role: Role.CUSTOMER,
            whatsappId: contact.id,
            remoteJid: contact.remoteJid,
            pushName: contact.pushName
          }
        });
        summary.users += 1;

        const func = await tx.funcionario.upsert({
          where: { userId: customer.id },
          update: {
            solicitante_id: requester.id,
            nome: customer.name,
            email: customer.email,
            telefone: faker.phone.number(),
            whatsappId: contact.id,
            pushName: contact.pushName,
            remoteJid: contact.remoteJid,
            profilePicUrl: contact.profilePicUrl,
            instanceId: "default",
            whatsappContactId: contact.id,
            isAdmin: i === 0
          },
          create: {
            solicitante_id: requester.id,
            userId: customer.id,
            nome: customer.name,
            email: customer.email,
            telefone: faker.phone.number(),
            whatsappId: contact.id,
            pushName: contact.pushName,
            remoteJid: contact.remoteJid,
            profilePicUrl: contact.profilePicUrl,
            instanceId: "default",
            whatsappContactId: contact.id,
            isAdmin: i === 0
          }
        });
        summary.funcionarios += 1;
        allCustomers.push({ userId: func.userId, solicitanteId: requester.id, name: customer.name, email: customer.email, whatsappId: customer.whatsappId });
      }
    }

    const conversationTargets = faker.helpers.arrayElements(createdWhatsAppContacts, Math.min(createdWhatsAppContacts.length, resolved.counts.conversations));

    for (const wa of conversationTargets) {
      const waChatId = `seed:${wa.id}`;
      const conversation = await tx.conversation.upsert({
        where: { waChatId },
        update: { status: "open", botActive: true, humanActive: false },
        create: { waChatId, status: "open", botActive: true, humanActive: false }
      });
      summary.conversations += 1;

      for (let i = 0; i < Math.max(0, resolved.counts.messagesPerConversation); i += 1) {
        const waMessageId = `wamid.seed.${waChatId}.${i + 1}`;
        await tx.message.upsert({
          where: { waMessageId },
          update: {
            direction: i % 2 === 0 ? "in" : "out",
            type: "text",
            body: faker.lorem.sentence(),
            status: "sent"
          },
          create: {
            waMessageId,
            conversationId: conversation.id,
            direction: i % 2 === 0 ? "in" : "out",
            type: "text",
            body: faker.lorem.sentence(),
            status: "sent",
            createdAt: new Date(Date.now() - (resolved.counts.messagesPerConversation - i) * 60_000)
          }
        });
        summary.messages += 1;
      }
    }

    const ticketIds = createdTickets.map((t) => t.id);
    const statusValues = ["PENDING", "IN_PROGRESS", "DONE"] as const;
    const priorityValues = ["HIGH", "MEDIUM", "LOW"] as const;

    for (let i = 0; i < Math.max(0, resolved.counts.tasks); i += 1) {
      const createdBy = faker.helpers.arrayElement(staffUsers);
      const assignee = faker.helpers.maybe(() => faker.helpers.arrayElement(staffUsers), { probability: 0.85 }) ?? null;
      const status = faker.helpers.arrayElement(statusValues);
      const dueAt = faker.helpers.maybe(() => faker.date.soon({ days: 7 }), { probability: 0.75 }) ?? null;
      const completedAt = status === "DONE" ? faker.date.recent({ days: 5 }) : null;
      const title = makeSeedSubject(faker.lorem.words({ min: 2, max: 5 }));

      const task = await tx.task.create({
        data: {
          title,
          description: faker.lorem.paragraph(),
          priority: faker.helpers.arrayElement(priorityValues),
          status,
          dueAt,
          completedAt,
          assigneeId: assignee?.id ?? null,
          createdById: createdBy.id,
          sortOrder: i + 1
        }
      });
      summary.tasks += 1;

      await tx.auditLog.create({
        data: {
          solicitanteId: faker.helpers.maybe(() => faker.helpers.arrayElement(createdRequesters).id, { probability: 0.6 }) ?? null,
          actorUserId: createdBy.id,
          action: "SEED_TASK_CREATED",
          entity: "Task",
          entityId: task.id,
          metadata: { seed: true }
        }
      });
      summary.auditLogs += 1;

      for (let s = 0; s < Math.max(0, resolved.counts.subtasksPerTask); s += 1) {
        await tx.taskSubtask.create({
          data: {
            taskId: task.id,
            title: faker.lorem.words({ min: 3, max: 7 }),
            isDone: status === "DONE" ? true : faker.datatype.boolean(0.35),
            sortOrder: s + 1
          }
        });
        summary.taskSubtasks += 1;
      }

      for (let a = 0; a < Math.max(0, resolved.counts.attachmentsPerTask); a += 1) {
        const fileName = `seed-${task.id}-${a + 1}.txt`;
        await tx.taskAttachment.create({
          data: {
            taskId: task.id,
            fileName,
            mimeType: "text/plain",
            fileSize: null,
            data: Buffer.from(faker.lorem.paragraphs({ min: 1, max: 2 }), "utf8"),
            createdById: createdBy.id
          }
        });
        summary.taskAttachments += 1;
      }

      const links = faker.helpers.arrayElements(ticketIds, Math.min(ticketIds.length, resolved.counts.ticketLinksPerTask));
      for (const ticketId of links) {
        await tx.taskTicketLink.create({
          data: {
            taskId: task.id,
            ticketId
          }
        });
        summary.taskTicketLinks += 1;
      }
    }

    const archivedTicket = createdTickets[0];
    const archivedContact = createdWhatsAppContacts[0];
    if (archivedTicket && archivedContact) {
      const conversationId = `seed:${archivedContact.id}`;
      const exists = await tx.chatConversation.findFirst({
        where: {
          contactId: archivedContact.id,
          channel: "whatsapp",
          conversationId,
          finalized: true
        }
      });

      if (!exists) {
        const closedAt = new Date();
        const jsonMessages = [
          {
            id: crypto.randomUUID(),
            contactId: archivedContact.id,
            channel: "whatsapp",
            direction: "in",
            text: "Conversa finalizada (seed).",
            createdAt: new Date(closedAt.getTime() - 120_000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            contactId: archivedContact.id,
            channel: "whatsapp",
            direction: "out",
            text: "Ok, registrado.",
            createdAt: new Date(closedAt.getTime() - 60_000).toISOString()
          }
        ];

        const createdChat = await tx.chatConversation.create({
          data: {
            contactId: archivedContact.id,
            contactName: archivedContact.pushName,
            channel: "whatsapp",
            conversationId,
            ticketId: archivedTicket.id,
            messages: jsonMessages as any,
            finalized: true,
            closedAt,
            createdBy: "Seed"
          }
        });
        summary.chatConversations += 1;

        await tx.ticketEvent.create({
          data: {
            ticketId: archivedTicket.id,
            type: TicketEventType.NOTE,
            title: "Chat vinculado ao ticket",
            description: `Conversa ${conversationId} vinculada ao ticket`,
            author: "Seed",
            authorId: adminUser.id,
            metadata: {
              seed: true,
              channel: "whatsapp",
              contactId: archivedContact.id,
              conversationId,
              chatConversationId: createdChat.id
            }
          }
        });
        summary.ticketEvents += 1;
      }
    }
    },
    {
      maxWait: 60_000,
      timeout: 180_000
    }
  );

  seedLog(resolved.verbose, "done", { ms: Date.now() - startedAt, summary });

  return summary;
}

export async function main() {
  const connectionString = resolveConnectionString();
  const prisma = createSeedPrismaClient(connectionString);
  try {
    const summary = await seedDatabase(prisma);
    console.log("[seed] ok", summary);
  } catch (error) {
    console.error("[seed] failed", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (isMainModule()) {
  main().catch(() => process.exit(1));
}
