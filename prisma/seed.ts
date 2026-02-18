import "dotenv/config";
import { Pool } from "pg";
import { randomUUID } from "crypto";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

function parseDate(dateStr: string): Date {
  // Format: "DD/MM/YYYY HH:mm"
  const [datePart, timePart] = dateStr.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function mapPriority(priority: string): string {
  switch (priority) {
    case "Alta": return "HIGH";
    case "Média": return "MEDIUM";
    default: return "NONE";
  }
}

function mapStatus(status: string): string {
  switch (status) {
    case "todo": return "TODO";
    case "doing": return "DOING";
    case "paused": return "PAUSED";
    case "done": return "DONE";
    default: return "TODO";
  }
}

const tickets = [
  {
    number: 2391,
    empresa: "NETMITT",
    solicitante: "João Vitor Lisboa",
    assunto: "Queda total de conectividade no bairro Centro",
    prioridade: "Alta",
    data: "17/02/2026 08:30",
    progressoSla: 72,
    progressoTarefa: 15,
    status: "todo",
    descricao: "Cliente reportou oscilação e indisponibilidade desde a madrugada.",
    contato: "joao@netmitt.com",
    tipoTicket: "Incidente",
    categoria: "Conectividade",
    mesaTrabalho: "NOC",
    operador: "Marciano",
    dataCriacao: "17/02/2026 06:30",
    slaResposta: "17/02/2026 07:00",
    slaSolucao: "17/02/2026 12:00",
    interacoes: [
      {
        id: "2391-1",
        autor: "Marciano",
        tempo: "há 2 dias",
        mensagem: "Validação inicial concluída. Estamos verificando enlace principal.",
        corBorda: "azul"
      },
      {
        id: "2391-2",
        autor: "NOC",
        tempo: "há 1 dia",
        mensagem: "Detectada degradação em interface upstream. Escalado para campo.",
        corBorda: "verde"
      }
    ]
  },
  {
    number: 2389,
    empresa: "LP INTERNET",
    solicitante: "Lucas",
    assunto: "Cliente sem acesso PPPoE após troca de roteador",
    prioridade: "Média",
    data: "16/02/2026 17:44",
    progressoSla: 45,
    progressoTarefa: 25,
    status: "todo",
    contato: "lucas@lpinternet.com",
    tipoTicket: "Suporte",
    categoria: "PPPoE",
    mesaTrabalho: "Incidentes",
    operador: "Cynthia",
    dataCriacao: "16/02/2026 17:10",
    slaResposta: "16/02/2026 18:00",
    slaSolucao: "17/02/2026 13:00",
    interacoes: []
  },
  {
    number: 2388,
    empresa: "ACEM PRIME SERVIÇOS",
    solicitante: "Cynthia",
    assunto: "Acompanhamento de ativação técnica",
    prioridade: "Sem prioridade",
    data: "16/02/2026 16:10",
    progressoSla: 20,
    progressoTarefa: 10,
    status: "todo",
    contato: "cynthia@acem.com",
    tipoTicket: "Ativação",
    categoria: "Projeto",
    mesaTrabalho: "Implantação",
    operador: "Marciano",
    interacoes: []
  },
  {
    number: 2384,
    empresa: "ACEM PRIME SERVIÇOS DE INTERNET LTDA",
    solicitante: "Cynthia",
    assunto: "Acompanhamento diário",
    prioridade: "Sem prioridade",
    data: "17/02/2026 03:00",
    progressoSla: 48,
    progressoTarefa: 52,
    status: "doing"
  },
  {
    number: 2376,
    empresa: "NETFIBRA",
    solicitante: "Marina",
    assunto: "Cliente sem comunicação com OLT NH",
    prioridade: "Média",
    data: "16/02/2026 18:55",
    progressoSla: 63,
    progressoTarefa: 45,
    status: "doing"
  },
  {
    number: 2381,
    empresa: "LP INTERNET",
    solicitante: "Fabrício",
    assunto: "LINK IP SUL CONNECT",
    prioridade: "Sem prioridade",
    data: "14/02/2026 15:59",
    progressoSla: 50,
    progressoTarefa: 50,
    status: "paused",
    descricao: "Boa tarde será liberado um link IP para parceiro SUL CONNECT.",
    contato: "noc@lpinternet.com.br",
    tipoTicket: "Incidente",
    categoria: "Roteamento",
    mesaTrabalho: "Incidentes",
    operador: "Marciano",
    dataCriacao: "14/02/2026 15:59",
    slaResposta: "16/02/2026 08:30",
    slaSolucao: "20/02/2026 16:00",
    interacoes: [
      {
        id: "2381-1",
        autor: "Marciano",
        tempo: "há 2 dias",
        mensagem: "ASN validado. Aguardando retorno do cliente para janela de mudança.",
        corBorda: "azul"
      },
      {
        id: "2381-2",
        autor: "Marciano",
        tempo: "há 2 dias",
        mensagem: "Atendimento interno: revisar prefixos e rota preferencial.",
        corBorda: "verde"
      },
      {
        id: "2381-3",
        autor: "Fabrício LP Internet",
        tempo: "há 3 dias",
        mensagem: "Solicitação inicial enviada para subir link em mesma porta com rede neutra.",
        corBorda: "vermelho"
      }
    ]
  },
  {
    number: 2334,
    empresa: "ACEM PRIME SERVIÇOS DE INTERNET LTDA",
    solicitante: "Cynthia",
    assunto: "ATIVAÇÃO | Bourbon Shopping 19/02",
    prioridade: "Alta",
    data: "05/02/2026 20:57",
    progressoSla: 84,
    progressoTarefa: 84,
    status: "paused"
  },
  {
    number: 2383,
    empresa: "NETMITT",
    solicitante: "João Vitor Lisboa",
    assunto: "Perda de comunicação com OLT NH",
    prioridade: "Média",
    data: "16/02/2026 16:44",
    progressoSla: 100,
    progressoTarefa: 100,
    status: "done"
  },
  {
    number: 2382,
    empresa: "ACEM PRIME SERVIÇOS DE INTERNET LTDA",
    solicitante: "Cynthia",
    assunto: "Acompanhamento diário",
    prioridade: "Sem prioridade",
    data: "16/02/2026 03:00",
    progressoSla: 100,
    progressoTarefa: 100,
    status: "done"
  }
];

async function main() {
  console.log("Start seeding (Direct PG)...");
  const client = await pool.connect();

  try {
    // Upsert Admin User
    const userEmail = "admin@ticketbr.com";
    const userRes = await client.query('SELECT id FROM "User" WHERE email = $1', [userEmail]);
    
    let userId;
    if (userRes.rows.length === 0) {
      userId = randomUUID();
      await client.query(`
        INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [userId, userEmail, "Admin", "ADMIN"]);
      console.log("Default user created.");
    } else {
      userId = userRes.rows[0].id;
      console.log("Default user already exists.");
    }

    for (const t of tickets) {
      const status = mapStatus(t.status);
      const priority = mapPriority(t.prioridade);
      const createdAt = parseDate(t.data);
      const responseSlaAt = t.slaResposta ? parseDate(t.slaResposta) : null;
      const solutionSlaAt = t.slaSolucao ? parseDate(t.slaSolucao) : null;

      // Upsert Ticket
      const ticketRes = await client.query('SELECT id FROM "Ticket" WHERE number = $1', [t.number]);
      let ticketId;

      if (ticketRes.rows.length > 0) {
        ticketId = ticketRes.rows[0].id;
        await client.query(`
          UPDATE "Ticket" SET
            company = $1, requester = $2, subject = $3, description = $4,
            status = $5::"TicketStatus", priority = $6::"TicketPriority", operator = $7, contact = $8,
            "ticketType" = $9, category = $10, workbench = $11, "responseSlaAt" = $12,
            "solutionSlaAt" = $13, "createdAt" = $14, "updatedAt" = NOW()
          WHERE id = $15
        `, [
          t.empresa, t.solicitante, t.assunto, t.descricao || null,
          status, priority, t.operador || null, t.contato || null,
          t.tipoTicket || null, t.categoria || null, t.mesaTrabalho || null,
          responseSlaAt, solutionSlaAt, createdAt,
          ticketId
        ]);
        console.log(`Updated ticket ${t.number}`);
      } else {
        ticketId = randomUUID();
        await client.query(`
          INSERT INTO "Ticket" (
            id, number, company, requester, subject, description,
            status, priority, operator, contact,
            "ticketType", category, workbench, "responseSlaAt",
            "solutionSlaAt", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7::"TicketStatus", $8::"TicketPriority", $9, $10,
            $11, $12, $13, $14,
            $15, $16, NOW()
          )
        `, [
          ticketId, t.number, t.empresa, t.solicitante, t.assunto, t.descricao || null,
          status, priority, t.operador || null, t.contato || null,
          t.tipoTicket || null, t.categoria || null, t.mesaTrabalho || null,
          responseSlaAt, solutionSlaAt, createdAt
        ]);
        console.log(`Created ticket ${t.number}`);
      }

      if (t.interacoes && t.interacoes.length > 0) {
        for (const interaction of t.interacoes) {
          // Check if similar event exists to avoid duplicates
          // Simplified: just insert for now, assuming clean DB or we don't care about duplicates in seed
          // But to be safe, let's verify count
          const eventId = randomUUID();
          await client.query(`
            INSERT INTO "TicketEvent" (
              id, "ticketId", type, title, description, author, "createdAt"
            ) VALUES (
              $1, $2, 'COMMENT', 'Comentário', $3, $4, NOW()
            )
          `, [eventId, ticketId, interaction.mensagem, interaction.autor]);
        }
      }
    }

    console.log("Seeding finished.");
  } catch (e) {
    console.error("Seeding error:", e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
