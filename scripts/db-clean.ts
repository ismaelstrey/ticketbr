import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";
import { PrismaClient, Role } from "../prisma/generated/client";

// Sem argumentos o script apenas simula a limpeza (dry-run).
// Use "--execute" para aplicar as exclusões no banco.
const shouldExecute = process.argv.includes("--execute");

// Tabelas de configuração que permanecem intactas após a limpeza
const CONFIG_MODELS = ["tipo_Ticket", "categoria_Ticket", "mesa_Trabalho"] as const;

// Constrói o client do Prisma respeitando o adaptador exigido pelo provedor
function createPrismaClient(connectionString: string): PrismaClient {
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

// Mostra o alvo da conexão sem expor credenciais
function describeTarget(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "conexão inválida";
  }
}

// Etapa de limpeza: uma tabela com contagem e exclusão total
type CleanStep = {
  table: string;
  description: string;
  count: (client: PrismaClient) => Promise<number>;
  remove: (client: PrismaClient) => Promise<number>;
};

// Ordem de exclusão respeitando as chaves estrangeiras (filhos antes dos pais)
const cleanSteps: CleanStep[] = [
  {
    table: "credential_access_grants",
    description: "Concessões de acesso do cofre",
    count: (c) => c.credentialAccessGrant.count(),
    remove: async (c) => (await c.credentialAccessGrant.deleteMany({})).count
  },
  {
    table: "equipment_credentials",
    description: "Credenciais do cofre",
    count: (c) => c.equipmentCredential.count(),
    remove: async (c) => (await c.equipmentCredential.deleteMany({})).count
  },
  {
    table: "equipment",
    description: "Equipamentos e hierarquia de infraestrutura",
    count: (c) => c.equipment.count(),
    remove: async (c) => (await c.equipment.deleteMany({})).count
  },
  {
    table: "client_shared_secrets",
    description: "Senhas padrão por cliente",
    count: (c) => c.clientSharedSecret.count(),
    remove: async (c) => (await c.clientSharedSecret.deleteMany({})).count
  },
  {
    table: "messages",
    description: "Mensagens de chat",
    count: (c) => c.message.count(),
    remove: async (c) => (await c.message.deleteMany({})).count
  },
  {
    table: "conversations",
    description: "Conversas do WhatsApp",
    count: (c) => c.conversation.count(),
    remove: async (c) => (await c.conversation.deleteMany({})).count
  },
  {
    table: "chat_conversations",
    description: "Histórico de chat finalizado",
    count: (c) => c.chatConversation.count(),
    remove: async (c) => (await c.chatConversation.deleteMany({})).count
  },
  {
    table: "ticket_events",
    description: "Eventos de ticket",
    count: (c) => c.ticketEvent.count(),
    remove: async (c) => (await c.ticketEvent.deleteMany({})).count
  },
  {
    table: "notifications",
    description: "Notificações",
    count: (c) => c.notification.count(),
    remove: async (c) => (await c.notification.deleteMany({})).count
  },
  {
    table: "task_comments",
    description: "Comentários de task",
    count: (c) => c.taskComment.count(),
    remove: async (c) => (await c.taskComment.deleteMany({})).count
  },
  {
    table: "task_ticket_links",
    description: "Vínculos task/ticket",
    count: (c) => c.taskTicketLink.count(),
    remove: async (c) => (await c.taskTicketLink.deleteMany({})).count
  },
  {
    table: "task_subtasks",
    description: "Subtasks",
    count: (c) => c.taskSubtask.count(),
    remove: async (c) => (await c.taskSubtask.deleteMany({})).count
  },
  {
    table: "task_attachments",
    description: "Anexos de task",
    count: (c) => c.taskAttachment.count(),
    remove: async (c) => (await c.taskAttachment.deleteMany({})).count
  },
  {
    table: "tasks",
    description: "Tasks",
    count: (c) => c.task.count(),
    remove: async (c) => (await c.task.deleteMany({})).count
  },
  {
    table: "project_export_audit",
    description: "Auditoria de exportação de projetos",
    count: (c) => c.projectExportAudit.count(),
    remove: async (c) => (await c.projectExportAudit.deleteMany({})).count
  },
  {
    table: "project_members",
    description: "Membros de projeto",
    count: (c) => c.projectMember.count(),
    remove: async (c) => (await c.projectMember.deleteMany({})).count
  },
  {
    table: "projects",
    description: "Projetos",
    count: (c) => c.project.count(),
    remove: async (c) => (await c.project.deleteMany({})).count
  },
  {
    table: "password_reset_tokens",
    description: "Tokens de recuperação de senha",
    count: (c) => c.passwordResetToken.count(),
    remove: async (c) => (await c.passwordResetToken.deleteMany({})).count
  },
  {
    table: "audit_logs",
    description: "Logs de auditoria",
    count: (c) => c.auditLog.count(),
    remove: async (c) => (await c.auditLog.deleteMany({})).count
  },
  {
    table: "kpi_snapshots",
    description: "Snapshots de KPI",
    count: (c) => c.kpiSnapshot.count(),
    remove: async (c) => (await c.kpiSnapshot.deleteMany({})).count
  },
  {
    table: "webhook_request_logs",
    description: "Logs de webhook",
    count: (c) => c.webhookRequestLog.count(),
    remove: async (c) => (await c.webhookRequestLog.deleteMany({})).count
  },
  {
    table: "tickets",
    description: "Tickets",
    count: (c) => c.ticket.count(),
    remove: async (c) => (await c.ticket.deleteMany({})).count
  },
  {
    table: "funcionarios",
    description: "Funcionários dos clientes",
    count: (c) => c.funcionario.count(),
    remove: async (c) => (await c.funcionario.deleteMany({})).count
  },
  {
    table: "whatsapp_contacts",
    description: "Contatos do WhatsApp",
    count: (c) => c.whatsAppContact.count(),
    remove: async (c) => (await c.whatsAppContact.deleteMany({})).count
  },
  {
    table: "solicitantes",
    description: "Clientes",
    count: (c) => c.solicitante.count(),
    remove: async (c) => (await c.solicitante.deleteMany({})).count
  }
];

// Conjunto de registros preservados: usuários admin e operadores de administração
type KeepSet = {
  adminUsers: Array<{ id: string; email: string; name: string }>;
  adminEmails: string[];
  adminOperadores: Array<{ id: string; email: string; nome: string }>;
};

async function loadKeepSet(client: PrismaClient): Promise<KeepSet> {
  const adminUsers = await client.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "asc" }
  });

  const adminEmails = adminUsers.map((user) => user.email);

  const adminOperadores = await client.operador.findMany({
    where: { OR: [{ email: { in: adminEmails } }, { perfil: "Admin" }] },
    select: { id: true, email: true, nome: true },
    orderBy: { created_at: "asc" }
  });

  return { adminUsers, adminEmails, adminOperadores };
}

// Descobre o nome da sequence do número do ticket para reiniciar a numeração
async function findTicketNumberSequence(client: PrismaClient): Promise<string | null> {
  const rows = await client.$queryRaw<Array<{ sequence_name: string }>>`
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_name ILIKE '%ticket%number%'
    LIMIT 1
  `;
  return rows[0]?.sequence_name ?? null;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const client = createPrismaClient(connectionString);

  try {
    console.log(`[db:clean] alvo: ${describeTarget(connectionString)}`);
    console.log(`[db:clean] modo: ${shouldExecute ? "EXECUÇÃO" : "simulação (dry-run)"}`);
    console.log();

    const keep = await loadKeepSet(client);
    if (!keep.adminUsers.length) {
      throw new Error("Nenhum usuário com papel ADMIN encontrado. Abortando para não remover o acesso administrativo.");
    }
    if (!keep.adminOperadores.length) {
      throw new Error("Nenhum operador administrador encontrado. Abortando para não remover o acesso administrativo.");
    }

    // Contagens atuais por tabela
    const counts = await Promise.all(
      cleanSteps.map(async (step) => ({ step, total: await step.count(client) }))
    );
    const configCounts = await Promise.all([
      client.tipo_Ticket.count(),
      client.categoria_Ticket.count(),
      client.mesa_Trabalho.count()
    ]);

    const groupMemberships = await client.userGroupMember.count({
      where: { userId: { notIn: keep.adminUsers.map((user) => user.id) } }
    });
    const removableUsers = await client.user.count({ where: { role: { not: Role.ADMIN } } });
    const removableOperadores = await client.operador.count({
      where: { id: { notIn: keep.adminOperadores.map((operador) => operador.id) } }
    });

    console.log("Registros a remover:");
    for (const { step, total } of counts) {
      console.log(`  ${step.table.padEnd(26)} ${String(total).padStart(6)}  ${step.description}`);
    }
    console.log(`  ${"user_group_members".padEnd(26)} ${String(groupMemberships).padStart(6)}  Vínculos de grupos (exceto admin)`);
    console.log(`  ${"users".padEnd(26)} ${String(removableUsers).padStart(6)}  Usuários (exceto ADMIN)`);
    console.log(`  ${"operadores".padEnd(26)} ${String(removableOperadores).padStart(6)}  Operadores (exceto admin)`);
    console.log();

    const totalToRemove =
      counts.reduce((acc, item) => acc + item.total, 0) + groupMemberships + removableUsers + removableOperadores;
    console.log(`Total de registros a remover: ${totalToRemove}`);
    console.log();

    console.log("Registros preservados:");
    console.log(`  tipo_Ticket                 ${String(configCounts[0]).padStart(6)}  Tipos de ticket`);
    console.log(`  categoria_Ticket            ${String(configCounts[1]).padStart(6)}  Categorias de ticket`);
    console.log(`  mesa_Trabalho               ${String(configCounts[2]).padStart(6)}  Mesas de trabalho`);
    for (const user of keep.adminUsers) {
      console.log(`  users (ADMIN)               ${user.email}  ${user.name}`);
    }
    for (const operador of keep.adminOperadores) {
      console.log(`  operadores (admin)          ${operador.email}  ${operador.nome}`);
    }
    console.log();

    if (!shouldExecute) {
      console.log("[db:clean] simulação concluída. Nenhum dado foi alterado.");
      console.log("[db:clean] para aplicar, execute: npm run db:clean:apply");
      return;
    }

    // Exclusões efetivas em transação para manter o banco consistente
    const removed: Array<{ table: string; count: number }> = [];
    await client.$transaction(
      async (tx) => {
        for (const step of cleanSteps) {
          removed.push({ table: step.table, count: await step.remove(tx as PrismaClient) });
        }

        const memberships = await tx.userGroupMember.deleteMany({
          where: { userId: { notIn: keep.adminUsers.map((user) => user.id) } }
        });
        removed.push({ table: "user_group_members", count: memberships.count });

        const users = await tx.user.deleteMany({ where: { role: { not: Role.ADMIN } } });
        removed.push({ table: "users", count: users.count });

        const operadores = await tx.operador.deleteMany({
          where: { id: { notIn: keep.adminOperadores.map((operador) => operador.id) } }
        });
        removed.push({ table: "operadores", count: operadores.count });
      },
      { maxWait: 60_000, timeout: 180_000 }
    );

    // Reinicia a numeração dos tickets para o primeiro ticket da produção ser o 1
    const sequenceName = await findTicketNumberSequence(client);
    if (sequenceName) {
      await client.$executeRawUnsafe(`ALTER SEQUENCE "${sequenceName}" RESTART WITH 1`);
      console.log(`[db:clean] numeração de tickets reiniciada (${sequenceName})`);
    } else {
      console.log("[db:clean] aviso: sequence de número de ticket não localizada; numeração não reiniciada.");
    }

    const totalRemoved = removed.reduce((acc, item) => acc + item.count, 0);
    console.log(`[db:clean] concluído: ${totalRemoved} registros removidos.`);
  } finally {
    await client.$disconnect();
  }
}

main().catch((error) => {
  console.error("[db:clean] falhou:", error instanceof Error ? error.message : error);
  process.exit(1);
});
