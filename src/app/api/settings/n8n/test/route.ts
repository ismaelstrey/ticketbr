import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsAppConfig, resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const fromBody = normalizeWhatsAppConfig(body);
    const config = await resolveWhatsAppConfig(request, fromBody);

    const baseUrl = normalizeBaseUrl(config?.n8nBaseUrl || "");
    if (!baseUrl) {
      return NextResponse.json({ error: "n8nBaseUrl não configurada" }, { status: 400 });
    }

    const apiKey = config?.n8nApiKey;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-N8N-API-KEY": apiKey, Authorization: `Bearer ${apiKey}` } : {})
    };

    // Validar não apenas health, mas também se os paths configurados existem (retornam algo diferente de 404)
    // Se for POST, tentamos GET apenas para ver se a rota existe (geralmente 405 Method Not Allowed ou 401/403 se auth falhar)
    // Se for GET, tentamos GET.
    
    const conversationsPath = config?.n8nConversationsPath || "/conversations";
    const messagesPath = config?.n8nMessagesPath || "/messages";
    const sendPath = config?.n8nSendPath || "/send";

    const pathsToTest = [
      { path: "/healthz", method: "GET", description: "Healthcheck" },
      { path: conversationsPath, method: "GET", description: "Conversations Path" },
      { path: messagesPath, method: "GET", description: "Messages Path" },
      // Para o sendPath, um GET geralmente retorna 404 se não existir ou 405 se existir mas só aceitar POST.
      // Vamos tentar um GET e interpretar o resultado.
      { path: sendPath, method: "GET", description: "Send Path (Check)" }
    ];

    const results: Array<Record<string, unknown>> = [];
    let overallSuccess = false;

    for (const test of pathsToTest) {
      const start = Date.now();
      const timer = withTimeout(10000); // 10s timeout
      
      try {
        const fullUrl = `${baseUrl}${test.path.startsWith("/") ? "" : "/"}${test.path}`;
        const res = await fetch(fullUrl, {
          method: test.method,
          headers,
          signal: timer.signal
        });
        timer.clear();

        const elapsedMs = Date.now() - start;
        const status = res.status;
        
        // Interpretação de sucesso:
        // 2xx: Sucesso total
        // 405: Rota existe, mas método errado (bom sinal para Send Path)
        // 401/403: Rota existe, mas auth falhou (significa que o n8n está lá)
        // 404: Rota não encontrada (ERRO)
        
        const isRouteValid = status !== 404;
        const isAuthValid = status !== 401 && status !== 403;
        
        results.push({
          path: test.path,
          description: test.description,
          status,
          ok: res.ok,
          validRoute: isRouteValid,
          validAuth: isAuthValid,
          elapsedMs
        });

        if (test.path === "/healthz" && res.ok) {
            overallSuccess = true;
        }

      } catch (error: any) {
        timer.clear();
        results.push({
          path: test.path,
          description: test.description,
          ok: false,
          error: error?.message || "Network error"
        });
      }
    }

    // Consideramos sucesso se pelo menos o healthcheck passar.
    // O frontend pode mostrar avisos se as rotas específicas falharem.
    if (overallSuccess) {
      return NextResponse.json({
        data: {
          ok: true,
          results
        }
      });
    }

    return NextResponse.json({ 
        error: "Falha na comunicação com n8n", 
        details: results 
    }, { status: 502 });

  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erro ao testar integração n8n" }, { status: 500 });
  }
}
