import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding ...')

  // Seed Tipo_Ticket
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

  for (const t of ticketTypes) {
    const type = await prisma.tipo_Ticket.upsert({
      where: { nome: t.nome },
      update: {},
      create: t,
    })
    console.log(`Created/Updated Ticket Type: ${type.nome}`)

    // Seed Categories for this type
    let categories: string[] = []
    if (t.nome === 'Incidente') {
      categories = ['Hardware', 'Software', 'Rede', 'Segurança']
    } else if (t.nome === 'Solicitação de Serviço') {
      categories = ['Acesso', 'Instalação', 'Dúvida', 'Equipamento']
    }

    for (const catName of categories) {
      await prisma.categoria_Ticket.upsert({
        where: {
          tipo_ticket_id_nome: {
            tipo_ticket_id: type.id,
            nome: catName,
          },
        },
        update: {},
        create: {
          nome: catName,
          descricao: `Categoria ${catName} para ${t.nome}`,
          tipo_ticket_id: type.id,
        },
      })
      console.log(`  - Created/Updated Category: ${catName}`)
    }
  }

  // Seed User (Legacy - for Login)
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

  // Seed Operador (Admin)
  const admin = await prisma.operador.upsert({
    where: { email: 'admin@ticketbr.com' },
    update: {
      senha_hash: hashedPassword, // Using same hash for consistency
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

  // Seed Mesa de Trabalho
  const mesa = await prisma.mesa_Trabalho.upsert({
    where: { id: 'mesa-n1-default' }, // using fixed ID for simplicity in upsert if possible, but ID is cuid. 
    // We can't upsert by ID easily if it's random. Let's try finding by name first or just create if empty.
    update: {},
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

  // Seed Solicitantes (Clientes)
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

  for (const r of requesters) {
    await prisma.solicitante.upsert({
      where: { cnpj: r.cnpj },
      update: {},
      create: r
    })
    console.log(`Created/Updated Requester: ${r.nome_fantasia}`)
  }
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
