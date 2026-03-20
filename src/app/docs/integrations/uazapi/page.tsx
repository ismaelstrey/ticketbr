import Link from "next/link";

export default function UazapiIntegrationDocPage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem 4rem", lineHeight: 1.7 }}>
      <h1>Integração TicketBR + UAZAPI</h1>
      <p>
        Este guia cobre a configuração do provedor UAZAPI no TicketBR, o cadastro do webhook para entrada de mensagens
        do WhatsApp e os cuidados para manter a troca de mensagens bidirecional funcionando.
      </p>

      <h2>1. Pré-requisitos</h2>
      <ul>
        <li>Instância UAZAPI ativa e conectada ao WhatsApp.</li>
        <li>Token da instância.</li>
        <li>Admin token, caso você queira configurar webhook pela própria API da UAZAPI.</li>
        <li>URL pública do TicketBR em produção, por exemplo: <code>https://seu-dominio.com</code>.</li>
      </ul>

      <h2>2. Configuração no TicketBR</h2>
      <ol>
        <li>Acesse <strong>Configurações → UAZAPI</strong>.</li>
        <li>Selecione <strong>UAZAPI</strong> como provedor do WhatsApp.</li>
        <li>Preencha a URL base ou escolha o subdomínio <code>api</code>/<code>free</code>.</li>
        <li>Informe o <strong>token</strong> da instância e, se disponível, o <strong>admin token</strong>.</li>
        <li>Salve as configurações.</li>
      </ol>

      <h2>3. Webhook recomendado</h2>
      <p>Cadastre o webhook da instância apontando para o endpoint abaixo:</p>
      <pre style={{ padding: 16, borderRadius: 12, background: "#111827", color: "#f9fafb", overflowX: "auto" }}>
{`POST /api/chat/webhook/uazapi\n\nURL final:\nhttps://seu-dominio.com/api/chat/webhook/uazapi`}
      </pre>
      <p>
        Se você habilitar <code>addUrlEvents</code> e/ou <code>addUrlTypesMessages</code> na UAZAPI, o TicketBR também aceita
        caminhos dinâmicos como <code>/api/chat/webhook/uazapi/message</code> e <code>/api/chat/webhook/uazapi/message/conversation</code>.
      </p>

      <h2>4. Payload sugerido na UAZAPI</h2>
      <p>Com base no arquivo <code>uazapi-openapi-spec.yaml</code> do projeto, a configuração recomendada do webhook é:</p>
      <pre style={{ padding: 16, borderRadius: 12, background: "#111827", color: "#f9fafb", overflowX: "auto" }}>
{`{
  "enabled": true,
  "url": "https://seu-dominio.com/api/chat/webhook/uazapi",
  "events": ["messages", "messages_update", "connection"],
  "excludeMessages": ["wasSentByApi"]
}`}
      </pre>

      <h2>5. O que o TicketBR processa</h2>
      <ul>
        <li>Mensagens recebidas do cliente no WhatsApp.</li>
        <li>Mensagens com texto, legenda e metadados básicos de mídia.</li>
        <li>Atualizações de status em <code>messages_update</code>/<code>status</code>.</li>
        <li>Rotas dinâmicas geradas pela opção <code>addUrlEvents</code>/<code>addUrlTypesMessages</code>.</li>
      </ul>

      <h2>6. Como evitar loops</h2>
      <p>
        Use <code>excludeMessages: ["wasSentByApi"]</code> no webhook da UAZAPI. Assim, mensagens enviadas pelo próprio
        TicketBR não retornam como novas entradas e não duplicam conversa ou automações.
      </p>

      <h2>7. Exemplo de configuração via API da UAZAPI</h2>
      <pre style={{ padding: 16, borderRadius: 12, background: "#111827", color: "#f9fafb", overflowX: "auto" }}>
{`curl -X POST "https://api.uazapi.com/webhook" \\
  -H "Content-Type: application/json" \\
  -H "token: SEU_TOKEN_DA_INSTANCIA" \\
  -d '{
    "enabled": true,
    "url": "https://seu-dominio.com/api/chat/webhook/uazapi",
    "events": ["messages", "messages_update", "connection"],
    "excludeMessages": ["wasSentByApi"]
  }'`}
      </pre>

      <h2>8. Teste rápido</h2>
      <ol>
        <li>Envie uma mensagem do painel do TicketBR para um contato.</li>
        <li>Peça para o cliente responder pelo WhatsApp.</li>
        <li>Confirme se a resposta aparece no histórico da conversa.</li>
        <li>Se necessário, verifique os logs do servidor para os eventos recebidos.</li>
      </ol>

      <p>
        Voltar para <Link href="/settings">Configurações</Link>.
      </p>
    </main>
  );
}
