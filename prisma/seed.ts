import "dotenv/config";
import { PrismaClient, TicketStatus, TicketPriority, TicketEventType } from "./generated/client";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaPostgresAdapter({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding ...')

  // 1. Seed Tipo_Ticket
  const ticketTypes = [
    {
      nome: 'Incidente',
      descricao: 'Interrupção não planejada de um serviço ou redução na qualidade do serviço.',
      sla_horas: 24,
      prioridade_default: 'Alta',
    },
    {
      nome: 'Solicitação de Serviço',
      descricao: 'Pedido de um usuário para informações, conselhos, uma mudança padrão ou acesso a um serviço.',
      sla_horas: 48,
      prioridade_default: 'Média',
    },
    {
      nome: 'Problema',
      descricao: 'Causa raiz de um ou mais incidentes.',
      sla_horas: 72,
      prioridade_default: 'Média',
    },
    {
      nome: 'Mudança',
      descricao: 'Adição, modificação ou remoção de qualquer coisa que possa ter efeito nos serviços de TI.',
      sla_horas: 120,
      prioridade_default: 'Baixa',
    },
  ]

  const createdTypes: Record<string, any> = {};

  for (const t of ticketTypes) {
    const type = await prisma.tipo_Ticket.upsert({
      where: { nome: t.nome },
      update: {
        descricao: t.descricao,
        sla_horas: t.sla_horas,
        prioridade_default: t.prioridade_default
      },
      create: t,
    })
    createdTypes[t.nome] = type;
    console.log(`Created/Updated Ticket Type: ${type.nome}`)

    // 2. Seed Categories for this type
    let categories: string[] = []
    if (t.nome === 'Incidente') {
      categories = ['Hardware', 'Software', 'Rede', 'Segurança']
    } else if (t.nome === 'Solicitação de Serviço') {
      categories = ['Acesso', 'Instalação', 'Dúvida', 'Equipamento']
    } else if (t.nome === 'Problema') {
      categories = ['Recorrente', 'Performance', 'Integridade']
    } else if (t.nome === 'Mudança') {
      categories = ['Infraestrutura', 'Aplicação', 'Processo']
    }

    for (const catName of categories) {
      await prisma.categoria_Ticket.upsert({
        where: {
          tipo_ticket_id_nome: {
            tipo_ticket_id: type.id,
            nome: catName,
          },
        },
        update: {
          descricao: `Categoria ${catName} para ${t.nome}`
        },
        create: {
          nome: catName,
          descricao: `Categoria ${catName} para ${t.nome}`,
          tipo_ticket_id: type.id,
        },
      })
      console.log(`  - Created/Updated Category: ${catName}`)
    }
  }

  // 3. Seed User (Legacy - for Login compatibility if needed)
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'admin@ticketbr.com' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'admin@ticketbr.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })
  console.log(`Created/Updated User (Legacy): ${user.email}`)

  // 4. Seed Operador (Admin)
  const admin = await prisma.operador.upsert({
    where: { email: 'admin@ticketbr.com' },
    update: {
      senha_hash: hashedPassword,
    },
    create: {
      nome: 'Administrador',
      email: 'admin@ticketbr.com',
      senha_hash: hashedPassword,
      matricula: 'ADM001',
      perfil: 'Admin',
      is_tecnico: true,
      especialidade: 'Geral',
    },
  })
  console.log(`Created/Updated Operator: ${admin.nome}`)

  // 5. Seed Mesa de Trabalho
  const mesa = await prisma.mesa_Trabalho.upsert({
    where: { id: 'mesa-n1-default' },
    update: {
        responsavel_id: admin.id
    },
    create: {
      id: 'mesa-n1-default',
      nome: 'Nível 1 - Geral',
      localizacao: 'Matriz - 1º Andar',
      capacidade: 10,
      tipo: 'N1',
      responsavel_id: admin.id,
    },
  })
  console.log(`Created/Updated Workbench: ${mesa.nome}`)

  // 6. Seed Solicitantes (Clientes)
  const requesters = [
    {
      razao_social: 'Empresa A Ltda',
      nome_fantasia: 'Empresa A',
      cnpj: '12345678000100',
      email: 'contato@empresaa.com',
      telefone: '11999990001',
      endereco_completo: 'Rua A, 100, SP',
    },
    {
      razao_social: 'Comércio B S.A.',
      nome_fantasia: 'Comércio B',
      cnpj: '98765432000199',
      email: 'suporte@comerciob.com',
      telefone: '21988880002',
      endereco_completo: 'Av B, 200, RJ',
    },
    {
      razao_social: 'Tech Solutions',
      nome_fantasia: 'Tech Sol',
      cnpj: '11223344000155',
      email: 'ti@techsol.com',
      telefone: '31977770003',
      endereco_completo: 'Rua C, 300, MG',
    }
  ]

  const createdRequesters: any[] = [];

  for (const r of requesters) {
    const req = await prisma.solicitante.upsert({
      where: { cnpj: r.cnpj },
      update: {},
      create: r
    })
    createdRequesters.push(req);
    console.log(`Created/Updated Requester: ${req.nome_fantasia}`)
  }

  // 7. Seed Tickets (Exemplos)
  // Ensure we have at least one type and requester
  if (createdTypes['Incidente'] && createdRequesters.length > 0) {
      const incidenteType = createdTypes['Incidente'];
      const requester = createdRequesters[0];
      
      // Fetch a category
      const category = await prisma.categoria_Ticket.findFirst({
          where: { tipo_ticket_id: incidenteType.id, nome: 'Software' }
      });

      if (category) {
        // Create a Ticket
        // Check if ticket already exists to avoid duplicates on re-seed (optional, usually seed cleans or adds)
        // Here we just create one if none exist for this requester to demo
        const existingTicket = await prisma.ticket.findFirst({
            where: { solicitante_id: requester.id, subject: 'Erro ao acessar sistema ERP' }
        });

        if (!existingTicket) {
            const ticket = await prisma.ticket.create({
                data: {
                    subject: 'Erro ao acessar sistema ERP',
                    description: 'Usuário relata erro 500 ao tentar login no módulo financeiro.',
                    status: TicketStatus.TODO,
                    priority: TicketPriority.HIGH,
                    solicitante_id: requester.id,
                    tipo_ticket_id: incidenteType.id,
                    categoria_id: category.id,
                    mesa_trabalho_id: mesa.id,
                    operador_id: admin.id,
                    // Legacy fields for compatibility
                    requester: requester.nome_fantasia,
                    operator: admin.nome,
                    ticketType: incidenteType.nome,
                    category: category.nome,
                    workbench: mesa.nome,
                    
                    events: {
                        create: [
                            {
                                type: TicketEventType.CREATED,
                                title: 'Ticket Criado',
                                description: 'Ticket criado via Seed',
                                author: 'System'
                            }
                        ]
                    }
                }
            });
            console.log(`Created Ticket: #${ticket.number} - ${ticket.subject}`);
        } else {
            console.log(`Ticket already exists: #${existingTicket.number}`);
        }
      }
  }

  // 8. Seed Funcionario (Exemplo vinculado a Solicitante)
  if (createdRequesters.length > 0) {
    const requester = createdRequesters[0]; // Empresa A
    
    // Create User for Funcionario
    const funcHashedPassword = await bcrypt.hash('func123', 10);
    const funcUser = await prisma.user.upsert({
      where: { email: 'func@empresaa.com' },
      update: { password: funcHashedPassword },
      create: {
        email: 'func@empresaa.com',
        name: 'Funcionário A',
        password: funcHashedPassword,
        role: 'CUSTOMER', // Assuming new role for limited access
        pushName: 'Funcionario A WhatsApp',
        remoteJid: '5511999990001@s.whatsapp.net'
      }
    });
    console.log(`Created/Updated User (Funcionario): ${funcUser.email}`);

    // Create Funcionario linked to Solicitante and User
    const funcionario = await prisma.funcionario.upsert({
      where: { userId: funcUser.id },
      update: {},
      create: {
        solicitante_id: requester.id,
        userId: funcUser.id,
        nome: 'Funcionário A',
        email: 'func@empresaa.com',
        telefone: '11999990001',
        whatsappId: '5511999990001@s.whatsapp.net',
        pushName: 'Funcionario A WhatsApp',
        remoteJid: '5511999990001@s.whatsapp.net'
      }
    });
    console.log(`Created/Updated Funcionario: ${funcionario.nome} linked to ${requester.nome_fantasia}`);
  }

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
