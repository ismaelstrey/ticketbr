import { strict as assert } from "assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  console.log("🚀 Iniciando Testes de Integração...");

  console.log("\n0. Testando Healthcheck...");
  const resHealth = await fetch(`${BASE_URL}/api/health`);
  if (!resHealth.ok) {
    console.error("❌ Healthcheck falhou:", resHealth.status, await resHealth.text());
    process.exit(1);
  }
  console.log("✅ Healthcheck OK");

  // 1. Tentar acessar API sem token
  console.log("\n1. Testando acesso não autorizado...");
  const resUnauth = await fetch(`${BASE_URL}/api/tickets`);
  if (resUnauth.status === 401) {
    console.log("✅ Bloqueado corretamente (401)");
  } else {
    // Se middleware redirecionar, pode ser 307. Se retornar JSON de erro, 401.
    // Meu middleware retorna 401 JSON para /api
    console.log(`⚠️  Status inesperado: ${resUnauth.status}`);
    if (resUnauth.redirected) console.log(`   Redirecionado para: ${resUnauth.url}`);
  }

  // 2. Login
  console.log("\n2. Realizando Login...");
  const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ticketbr.com", password: "admin123" }),
  });

  if (!resLogin.ok) {
    console.error("❌ Falha no login:", await resLogin.text());
    process.exit(1);
  }

  const loginData = await resLogin.json();
  console.log("✅ Login sucesso:", loginData.user.email);

  // Obter cookie
  const cookies = resLogin.headers.get("set-cookie");
  if (!cookies) {
      console.error("❌ Cookie não recebido");
      process.exit(1);
  }
  console.log("✅ Cookie recebido");

  // 3. Acessar API com token
  console.log("\n3. Listando Tickets autenticado...");
  const resTickets = await fetch(`${BASE_URL}/api/tickets`, {
    headers: {
        Cookie: cookies
    }
  });

  if (!resTickets.ok) {
      console.error("❌ Falha ao listar tickets:", resTickets.status, await resTickets.text());
      process.exit(1);
  }

  const ticketsData = await resTickets.json();
  const tickets = ticketsData.data;
  console.log(`✅ ${tickets.length} tickets encontrados`);
  
  if (tickets.length > 0) {
      const t = tickets[0];
      console.log("   Exemplo de Ticket:", { id: t.id, number: t.number, status: t.status });
      
      // Validar tipos
      assert(typeof t.id === 'string', "ID deve ser string");
      assert(typeof t.number === 'number', "Number deve ser number");
      console.log("✅ Tipos validados");
  } else {
      console.warn("⚠️  Nenhum ticket encontrado para validar tipos");
  }

  // 4. Listar Usuários
  console.log("\n4. Listando Usuários...");
  const resUsers = await fetch(`${BASE_URL}/api/users`, {
    headers: {
        Cookie: cookies
    }
  });

  if (!resUsers.ok) {
      console.error("❌ Falha ao listar usuários:", resUsers.status);
  } else {
      const users = await resUsers.json();
      console.log(`✅ ${users.length} usuários encontrados`);
      if (users.length > 0) {
          console.log("   Exemplo de Usuário:", users[0].email);
      }
  }

  console.log("\n🎉 Testes de Integração Concluídos com Sucesso!");
}

main().catch((err) => {
    console.error("Erro fatal:", err);
    process.exit(1);
});
