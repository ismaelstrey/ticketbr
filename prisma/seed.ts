import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
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
  solicitantes: number;
  funcionarios: number;
  tickets: number;
  conversations: number;
  messages: number;
  chatConversations: number;
};

export async function seedDatabase(prisma: PrismaClient): Promise<SeedSummary> {
  const summary: SeedSummary = {
    users: 0,
    solicitantes: 0,
    funcionarios: 0,
    tickets: 0,
    conversations: 0,
    messages: 0,
    chatConversations: 0
  };

  const hashedAdminPassword = await bcrypt.hash("admin123", 10);
  const hashedCustomerPassword = await bcrypt.hash("func123", 10);

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

  const requesters = [
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

  const whatsappContacts = [
    {
      id: "5511999990001@s.whatsapp.net",
      remoteJid: "5511999990001@s.whatsapp.net",
      pushName: "Funcionario A WhatsApp",
      profilePicUrl: "https://ui-avatars.com/api/?name=Funcionario+A",
      instanceId: "default"
    },
    {
      id: "5521999990002@s.whatsapp.net",
      remoteJid: "5521999990002@s.whatsapp.net",
      pushName: "Funcionario B WhatsApp",
      profilePicUrl: "https://ui-avatars.com/api/?name=Funcionario+B",
      instanceId: "default"
    },
    {
      id: "5531999990003@s.whatsapp.net",
      remoteJid: "5531999990003@s.whatsapp.net",
      pushName: "Funcionario C WhatsApp",
      profilePicUrl: "https://ui-avatars.com/api/?name=Funcionario+C",
      instanceId: "default"
    }
  ] as const;

  const createdTypes = new Map<string, { id: string; nome: string }>();

  for (const t of ticketTypes) {
    const type = await prisma.tipo_Ticket.upsert({
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
      await prisma.categoria_Ticket.upsert({
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

  const adminUser = await prisma.user.upsert({
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

  const admin = await prisma.operador.upsert({
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

  const mesa = await prisma.mesa_Trabalho.upsert({
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

  const createdRequesters: Array<{ id: string; nome_fantasia: string; razao_social: string; email: string; telefone: string }> = [];
  for (const r of requesters) {
    const req = await prisma.solicitante.upsert({
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
  summary.solicitantes = createdRequesters.length;

  const createdWhatsAppContacts: Array<{ id: string; remoteJid: string; pushName: string }> = [];
  for (const wa of whatsappContacts) {
    const item = await prisma.whatsAppContact.upsert({
      where: { id: wa.id },
      update: {
        remoteJid: wa.remoteJid,
        pushName: wa.pushName,
        profilePicUrl: wa.profilePicUrl,
        instanceId: wa.instanceId,
        updatedAt: new Date()
      },
      create: {
        id: wa.id,
        remoteJid: wa.remoteJid,
        pushName: wa.pushName,
        profilePicUrl: wa.profilePicUrl,
        instanceId: wa.instanceId,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncedAt: new Date()
      }
    });
    createdWhatsAppContacts.push({ id: item.id, remoteJid: item.remoteJid, pushName: item.pushName || "" });
  }

  const customerEmails = ["func@empresaa.com", "func@comerciob.com", "func@techsol.com"] as const;

  for (let i = 0; i < createdRequesters.length; i += 1) {
    const requester = createdRequesters[i];
    const wa = createdWhatsAppContacts[i];
    const email = customerEmails[i];

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedCustomerPassword,
        role: Role.CUSTOMER,
        name: `Funcionário ${String.fromCharCode(65 + i)}`,
        whatsappId: wa?.id ?? null,
        remoteJid: wa?.remoteJid ?? null,
        pushName: wa?.pushName ?? null
      },
      create: {
        email,
        name: `Funcionário ${String.fromCharCode(65 + i)}`,
        password: hashedCustomerPassword,
        role: Role.CUSTOMER,
        whatsappId: wa?.id ?? null,
        remoteJid: wa?.remoteJid ?? null,
        pushName: wa?.pushName ?? null
      }
    });
    summary.users += 1;

    await prisma.funcionario.upsert({
      where: { userId: user.id },
      update: {
        solicitante_id: requester.id,
        nome: user.name,
        email: user.email,
        telefone: requester.telefone,
        whatsappId: wa?.id ?? null,
        pushName: wa?.pushName ?? null,
        remoteJid: wa?.remoteJid ?? null,
        whatsappContactId: wa?.id ?? null
      },
      create: {
        solicitante_id: requester.id,
        userId: user.id,
        nome: user.name,
        email: user.email,
        telefone: requester.telefone,
        whatsappId: wa?.id ?? null,
        pushName: wa?.pushName ?? null,
        remoteJid: wa?.remoteJid ?? null,
        whatsappContactId: wa?.id ?? null
      }
    });
    summary.funcionarios += 1;
  }

  const incidentType = createdTypes.get("Incidente");
  const serviceType = createdTypes.get("Solicitação de Serviço");

  const ensureCategory = async (typeId: string, name: string) => {
    const found = await prisma.categoria_Ticket.findFirst({ where: { tipo_ticket_id: typeId, nome: name } });
    return found?.id ?? null;
  };

  const ticketTemplates = [
    {
      subject: "Erro ao acessar sistema ERP",
      description: "Usuário relata erro 500 ao tentar login no módulo financeiro.",
      status: TicketStatus.TODO,
      priority: TicketPriority.HIGH,
      type: "Incidente",
      category: "Software"
    },
    {
      subject: "Solicitação de acesso VPN",
      description: "Solicitante precisa de acesso remoto para trabalho externo.",
      status: TicketStatus.DOING,
      priority: TicketPriority.MEDIUM,
      type: "Solicitação de Serviço",
      category: "Acesso"
    }
  ] as const;

  const createdTickets: Array<{ id: string; number: number; subject: string; solicitanteId: string }> = [];

  for (const requester of createdRequesters) {
    for (const template of ticketTemplates) {
      const type = createdTypes.get(template.type);
      if (!type) continue;
      const categoryId = await ensureCategory(type.id, template.category);

      const existing = await prisma.ticket.findFirst({
        where: { solicitante_id: requester.id, subject: template.subject }
      });
      if (existing) {
        createdTickets.push({ id: existing.id, number: existing.number, subject: existing.subject, solicitanteId: requester.id });
        continue;
      }

      const created = await prisma.ticket.create({
        data: {
          subject: template.subject,
          description: template.description,
          status: template.status,
          priority: template.priority,
          solicitante_id: requester.id,
          tipo_ticket_id: type.id,
          categoria_id: categoryId ?? undefined,
          mesa_trabalho_id: mesa.id,
          operador_id: admin.id,
          requester: requester.nome_fantasia,
          company: requester.nome_fantasia,
          operator: admin.nome,
          ticketType: type.nome,
          category: template.category,
          workbench: mesa.nome,
          events: {
            create: [
              {
                type: TicketEventType.CREATED,
                title: "Ticket Criado",
                description: "Ticket criado via Seed",
                author: "System"
              }
            ]
          }
        }
      });
      createdTickets.push({ id: created.id, number: created.number, subject: created.subject, solicitanteId: requester.id });
      summary.tickets += 1;
    }
  }

  for (const wa of createdWhatsAppContacts) {
    const conversation = await prisma.conversation.upsert({
      where: { waChatId: wa.id },
      update: { status: "open", botActive: true, humanActive: false },
      create: { waChatId: wa.id, status: "open", botActive: true, humanActive: false }
    });
    summary.conversations += 1;

    const now = Date.now();
    const samples = [
      { direction: "in", type: "text", body: "Olá! Preciso de ajuda." },
      { direction: "out", type: "text", body: "Claro! Em que posso ajudar?" },
      { direction: "in", type: "text", body: "Meu acesso está com erro." }
    ] as const;

    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i];
      const waMessageId = `wamid.seed.${wa.id}.${i + 1}`;
      await prisma.message.upsert({
        where: { waMessageId },
        update: {
          direction: sample.direction,
          type: sample.type,
          body: sample.body,
          status: "sent"
        },
        create: {
          waMessageId,
          conversationId: conversation.id,
          direction: sample.direction,
          type: sample.type,
          body: sample.body,
          status: "sent",
          createdAt: new Date(now - (samples.length - i) * 60_000)
        }
      });
      summary.messages += 1;
    }
  }

  const archivedTicket = createdTickets.find((t) => t.subject === "Erro ao acessar sistema ERP") ?? createdTickets[0];
  const archivedRequester = archivedTicket ? createdRequesters.find((r) => r.id === archivedTicket.solicitanteId) : null;
  const archivedContact = createdWhatsAppContacts[0];

  if (archivedTicket && archivedRequester && archivedContact) {
    const conversationId = `whatsapp:${archivedContact.id}`;
    const exists = await prisma.chatConversation.findFirst({
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
          id: "seed_msg_1",
          contactId: archivedContact.id,
          channel: "whatsapp",
          direction: "in",
          text: "Conversa finalizada (exemplo).",
          createdAt: new Date(closedAt.getTime() - 120_000).toISOString()
        },
        {
          id: "seed_msg_2",
          contactId: archivedContact.id,
          channel: "whatsapp",
          direction: "out",
          text: "Ok, vamos registrar no ticket.",
          createdAt: new Date(closedAt.getTime() - 60_000).toISOString()
        }
      ];

      const createdChat = await prisma.chatConversation.create({
        data: {
          contactId: archivedContact.id,
          contactName: `Funcionário ${archivedRequester.nome_fantasia}`,
          channel: "whatsapp",
          conversationId,
          ticketId: archivedTicket.id,
          messages: jsonMessages as any,
          finalized: true,
          closedAt,
          createdBy: admin.nome
        }
      });
      summary.chatConversations += 1;

      await prisma.ticketEvent.create({
        data: {
          ticketId: archivedTicket.id,
          type: TicketEventType.NOTE,
          title: "Chat vinculado ao ticket",
          description: `Conversa ${conversationId} vinculada ao ticket`,
          author: admin.nome,
          metadata: {
            channel: "whatsapp",
            contactId: archivedContact.id,
            conversationId,
            chatConversationId: createdChat.id
          }
        }
      });
    }
  }

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
