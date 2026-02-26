# Integração TicketBR ↔ n8n (guia prático)

Este documento explica **como implementar a comunicação com o n8n** no projeto atual, aproveitando a estrutura já existente em `src/server/services/n8n-adapter.ts`.

> ⚠️ Segurança: não versione tokens JWT/Bearer reais em repositório. Use variáveis de ambiente.

## 1) O que já existe hoje no código

A base da integração já está pronta:

- `src/server/services/n8n-adapter.ts`
  - Resolve base URL/webhook via config/cookie/env.
  - Faz requests autenticadas para n8n (`Authorization: Bearer ...`).
  - Já possui helpers para:
    - buscar conversas (`fetchConversationsFromN8n`)
    - buscar mensagens (`fetchMessagesFromN8n`)
    - enviar mensagem (`sendMessageToN8n`)
    - emitir eventos para webhook (`emitChatEventToN8n`)
- `src/server/services/whatsapp-settings.ts`
  - Suporta configuração `n8nBaseUrl`, `n8nApiKey`, paths customizáveis e `n8nWebhookUrl`.
- Rotas de chat já emitem eventos para n8n:
  - `chat.message.sent`
  - `chat.message.received`
  - `chat.ticket.linked`

## 2) Modelo de integração recomendado

Use dois padrões em paralelo:

1. **Eventos (push)**: TicketBR → n8n via webhook (`emitChatEventToN8n`).
2. **Consulta/ação (pull + command)**: TicketBR consulta o n8n para listas/histórico e envia comandos de envio.

### Endpoints esperados no n8n

Defina no n8n (ou proxy/API na frente dele):

- `GET /conversations`
- `GET /messages?contactId=...&channel=...&phone=...`
- `POST /send`

Esses paths já podem ser customizados via:

- `n8nConversationsPath`
- `n8nMessagesPath`
- `n8nSendPath`

## 3) Configuração no TicketBR

Você pode configurar por cookie (tela/settings) ou por variável de ambiente:

```bash
N8N_CHAT_BASE_URL=https://n8n.seu-dominio.com/api/chat
N8N_CHAT_API_KEY=coloque_token_aqui
N8N_CHAT_WEBHOOK_URL=https://n8n.seu-dominio.com/webhook/ticketbr-events
```

Ou no payload de config (`/api/settings/whatsapp/config`):

```json
{
  "n8nBaseUrl": "https://n8n.seu-dominio.com/api/chat",
  "n8nApiKey": "***",
  "n8nWebhookUrl": "https://n8n.seu-dominio.com/webhook/ticketbr-events",
  "n8nConversationsPath": "/conversations",
  "n8nMessagesPath": "/messages",
  "n8nSendPath": "/send"
}
```

## 4) Estrutura de resposta que o TicketBR espera

### `GET /conversations`

Aceita tanto `[{...}]` quanto `{ "data": [{...}] }`.

Campos úteis por item:

```json
{
  "id": "conv_123",
  "contactId": "cli_1",
  "name": "Cliente XPTO",
  "phone": "5511999999999",
  "email": "cliente@exemplo.com",
  "company": "XPTO Ltda",
  "tags": ["VIP"],
  "conversationId": "conv_123",
  "lastMessagePreview": "Olá",
  "lastMessageAt": "2026-02-21T13:00:00.000Z"
}
```

### `GET /messages`

Aceita `[{...}]` ou `{ "data": [{...}] }`.

```json
{
  "id": "msg_1",
  "contactId": "cli_1",
  "direction": "in",
  "text": "Mensagem",
  "attachment": null,
  "createdAt": "2026-02-21T13:00:00.000Z"
}
```

### `POST /send`

Recebe payload livre (repasse do front/API) e deve retornar JSON de sucesso/erro.

## 5) Eventos enviados para o n8n

Todos no formato:

```json
{
  "type": "chat.message.sent",
  "source": "ticketbr-chat",
  "occurredAt": "2026-02-21T13:00:00.000Z",
  "data": {}
}
```

Tipos atuais:

- `chat.message.sent`
- `chat.message.received`
- `chat.ticket.linked`

No n8n, comece com um **Webhook Trigger** e roteie por `{{$json.type}}` usando `Switch`.

## 6) Como usar o MCP do n8n (estrutura sugerida)

Você compartilhou configuração MCP com `supergateway`. O ideal é manter o token em variável de ambiente.

Exemplo (sanitizado):

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--streamableHttp",
        "https://n8n.strey.com.br/mcp-server/http",
        "--header",
        "authorization:Bearer ${N8N_MCP_TOKEN}"
      ]
    }
  }
}
```

### Passos práticos

1. Definir `N8N_MCP_TOKEN` no ambiente local/CI.
2. Subir o cliente MCP com `supergateway`.
3. No n8n, expor as ferramentas/resources necessários para:
   - listar conversas
   - listar mensagens
   - enviar mensagens
   - registrar vínculos ticket↔conversa
4. Se quiser, criar um nó/função n8n que normalize resposta para o formato esperado no item 4.

## 7) Ajuste opcional no backend (trocar Evolution por n8n)

Hoje `/api/chat/contacts` e `/api/chat/messages` ainda priorizam Evolution para leitura/envio direto.

Se quiser operar n8n-first, o ajuste é simples:

- Em `src/app/api/chat/contacts/route.ts`: usar `fetchConversationsFromN8n(config)` quando `isN8nConfigured(config)`.
- Em `src/app/api/chat/messages/route.ts`:
  - `GET`: usar `fetchMessagesFromN8n(...)`
  - `POST`: usar `sendMessageToN8n(...)`

Isso permite centralizar toda automação no n8n sem depender da API Evolution diretamente no TicketBR.

## 8) Checklist de validação

- [ ] Config salvas em `/api/settings/whatsapp/config` com `n8nBaseUrl` e `n8nApiKey`.
- [ ] `GET /api/chat/contacts` retornando dados (local/evolution/n8n conforme estratégia).
- [ ] `GET /api/chat/messages` retornando histórico.
- [ ] `POST /api/chat/messages` enviando com sucesso.
- [ ] Webhook recebendo `chat.message.sent`, `chat.message.received`, `chat.ticket.linked`.
- [ ] Tokens fora do Git e mascarados nas respostas da API.

---

Se você quiser, no próximo passo eu já posso aplicar a refatoração n8n-first nas rotas de chat (`contacts` e `messages`) para ficar 100% integrado ao n8n.
