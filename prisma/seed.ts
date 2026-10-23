import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";
import { PrismaClient, Role } from "./generated/client";

// Bootstrap de produção: cria apenas o acesso administrativo e as configurações
// essenciais (tipos de ticket, categorias e mesa de trabalho padrão).
// É idempotente — pode ser executado várias vezes sem duplicar registros.

type SeedSummary = {
  adminEmail: string;
  ticketTypes: number;
  ticketCategories: number;
  mesaTrabalho: string;
};

// Tipos de ticket e categorias padrão do produto
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

function resolveAdminConfig() {
  const email = (process.env.ADMIN_EMAIL || "admin@ticketbr.com").trim();
  const name = (process.env.ADMIN_NAME || "Administrador").trim();
  const matricula = (process.env.ADMIN_MATRICULA || "ADM001").trim();
  const password = (process.env.ADMIN_PASSWORD || "").trim();

  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD é obrigatório para criar o acesso administrativo. Defina a variável no .env antes de executar o seed."
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD deve ter ao menos 8 caracteres.");
  }

  return { email, name, matricula, password };
}

export async function seedDatabase(prisma: PrismaClient): Promise<SeedSummary> {
  const admin = resolveAdminConfig();
  const hashedAdminPassword = await bcrypt.hash(admin.password, 10);

  // A senha é definida apenas na criação: reexecuções não invalidam um acesso já alterado
  const adminUser = await prisma.user.upsert({
    where: { email: admin.email },
    update: { name: "Admin", role: Role.ADMIN },
    create: {
      email: admin.email,
      name: "Admin",
      password: hashedAdminPassword,
      role: Role.ADMIN
    }
  });

  await prisma.operador.upsert({
    where: { email: admin.email },
    update: {
      nome: admin.name,
      perfil: "Admin",
      is_tecnico: true,
      is_active: true,
      especialidade: "Geral"
    },
    create: {
      nome: admin.name,
      email: admin.email,
      senha_hash: hashedAdminPassword,
      matricula: admin.matricula,
      perfil: "Admin",
      is_tecnico: true,
      is_active: true,
      especialidade: "Geral"
    }
  });

  const mesa = await prisma.mesa_Trabalho.upsert({
    where: { id: "mesa-n1-default" },
    update: {
      responsavel_id: adminUser.id,
      nome: "Nível 1 - Geral",
      localizacao: "Matriz - 1º Andar",
      capacidade: 10,
      tipo: "N1"
    },
    create: {
      id: "mesa-n1-default",
      nome: "Nível 1 - Geral",
      localizacao: "Matriz - 1º Andar",
      capacidade: 10,
      tipo: "N1",
      responsavel_id: adminUser.id
    }
  });

  let ticketCategories = 0;
  for (const type of ticketTypes) {
    const created = await prisma.tipo_Ticket.upsert({
      where: { nome: type.nome },
      update: {
        descricao: type.descricao,
        sla_horas: type.sla_horas,
        prioridade_default: type.prioridade_default
      },
      create: type
    });

    for (const name of categoryByType[type.nome] || []) {
      await prisma.categoria_Ticket.upsert({
        where: {
          tipo_ticket_id_nome: {
            tipo_ticket_id: created.id,
            nome: name
          }
        },
        update: { descricao: `Categoria ${name} para ${type.nome}` },
        create: {
          nome: name,
          descricao: `Categoria ${name} para ${type.nome}`,
          tipo_ticket_id: created.id
        }
      });
      ticketCategories += 1;
    }
  }

  return {
    adminEmail: adminUser.email,
    ticketTypes: ticketTypes.length,
    ticketCategories,
    mesaTrabalho: mesa.id
  };
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
