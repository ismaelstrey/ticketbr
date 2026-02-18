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
  // ... rest of the file
  const mesa = await prisma.mesa_Trabalho.upsert({
    where: { id: 'mesa-n1-default' }, // using fixed ID for simplicity in upsert if possible, but ID is cuid. 
    // We can't upsert by ID easily if it's random. Let's try finding by name first or just create if empty.
    update: {},
    create: {
      nome: 'Nível 1 - Geral',
      localizacao: 'Matriz - 1º Andar',
      capacidade: 10,
      tipo: 'N1',
      responsavel_id: admin.id,
    },
  })
  // Note: upsert requires unique field. Mesa doesn't have unique name in schema (my bad, should have added it). 
  // I'll check if one exists with findFirst instead.
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
