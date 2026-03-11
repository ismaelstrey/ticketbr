
# Documentação de Integração – TicketBR (Backend) ↔ n8n ↔ Evolution API (Baileys)  
**Modo:** Híbrido (bot/IA + humano) • **Instância:** `ismael` • **Data:** 2026-03-11

## 1. Visão geral
Esta documentação descreve como integrar seu **backend (TicketBR)** a um gateway WhatsApp baseado em:
- **Evolution API (Baileys)**: conexão WhatsApp “estilo WhatsApp Web”
- **n8n**: orquestração de eventos e ações
- **TicketBR**: sistema de tickets + regras de atendimento + IA

### Objetivo de produto (experiência WhatsApp Web)
- Receber mensagens: texto, imagem, áudio (e extensível para vídeo/documento)
- Enviar mensagens: texto, mídia, áudio PTT
- Presença: digitando/pausado (typing)
- Recibos: sent/delivered/read
- Marcar como lida (read receipts)
- Fluxo híbrido: IA sugere, IA responde quando permitido, humano assume quando necessário

---

## 2. Componentes e responsabilidades

### 2.1 Evolution API (Baileys)
- Emite eventos webhook (inbound) como:
  - `messages.upsert` (mensagens novas)
  - `messages.update` (status: sent/delivered/read)
  - `presence.update` (available/composing/recording/paused)
- Fornece endpoints HTTP para envio e ações:
  - `/message/sendText/{instance}`
  - `/message/sendMedia/{instance}`
  - `/message/sendWhatsAppAudio/{instance}`
  - `/chat/sendPresence/{instance}`
  - `/chat/markMessageAsRead/{instance}`

### 2.2 n8n (gateway/orquestrador)
- Recebe webhooks do Evolution e normaliza.
- Encaminha eventos normalizados ao TicketBR.
- Recebe um **plano de ações** do TicketBR e executa (self-call) envio e ações (typing/read).

### 2.3 TicketBR (seu backend)
- Fonte de verdade de:
  - conversas/tickets
  - mensagens (entrada/saída)
  - estado do atendimento (bot ativo vs humano)
- Decide “híbrido”:
  - quando a IA responde
  - quando a IA só sugere
  - quando fazer handoff para humano
- Retorna para o n8n um **plano de ações** (`actions[]`) para executar.

---

## 3. Endpoints (URLs finais)

### 3.1 Evolution → n8n (INBOUND)
Configure no Evolution:
- `POST https://n8n.strey.com.br/webhook/wa/baileys/inbound`

### 3.2 n8n → TicketBR (webhooks do seu backend)
- `POST https://ticketbr.vercel.app/chat/inbound`  (mensagens)
- `POST https://ticketbr.vercel.app/chat/status`   (status)
- `POST https://ticketbr.vercel.app/chat/presence` (presença)
- (opcional) `POST https://ticketbr.vercel.app/chat/media-ready` (mídia estável)

### 3.3 TicketBR → n8n (opcional, para chamadas diretas)
- `POST https://n8n.strey.com.br/webhook/wa/baileys/send`
- `POST https://n8n.strey.com.br/webhook/wa/baileys/action`

> Recomendação: no modo híbrido proposto, o TicketBR normalmente **não precisa** chamar `/send` e `/action` diretamente, pois ele devolve `actions[]` na resposta do `/chat/inbound` e o n8n executa.

---

## 4. Segurança

### 4.1 Autenticação TicketBR → n8n
Quando o TicketBR chamar `/send` ou `/action` diretamente (ou quando o n8n fizer self-call), usar:
- Header: `X-Chat-Token: <CHAT_TOKEN>`

No n8n, configurar a variável:
- `CHAT_TOKEN`

### 4.2 Autenticação n8n → Evolution
O n8n chama Evolution com:
- Header: `apikey: <EVOLUTION_APIKEY>`

No n8n, configurar a variável:
- `EVOLUTION_APIKEY`

---

## 5. Normalização de eventos (contrato n8n → TicketBR)

O n8n recebe payload “raw” do Evolution e envia ao TicketBR um JSON **normalizado**.

### 5.1 Mensagem (event = `message`)
**POST** `/chat/inbound`

#### Campos
- `provider`: `"evolution"`
- `mode`: `"baileys"`
- `event`: `"message"`
- `instance`: `"ismael"`
- `wa_chat_id`: JID do chat, ex.: `555199999999@s.whatsapp.net`
- `wa_message_id`: ID da mensagem, ex.: `BAE5...`
- `fromMe`: boolean
- `pushName`: string | null
- `timestamp`: unix epoch (segundos) | null
- `message`:
  - `type`: `text|image|audio|video|document|unknown`
  - `text`: string|null
  - `caption`: string|null
  - `media`: `{ url, mimetype } | null`
- `raw`: payload original (para debug/auditoria)

#### Exemplo: texto
```json
{
  "provider": "evolution",
  "mode": "baileys",
  "event": "message",
  "instance": "ismael",
  "wa_chat_id": "555199999999@s.whatsapp.net",
  "wa_message_id": "BAE5F8A2D4B3C1",
  "fromMe": false,
  "pushName": "Cliente Teste",
  "timestamp": 1710000000,
  "message": {
    "type": "text",
    "text": "Olá, gostaria de saber o preço.",
    "caption": null,
    "media": null
  },
  "raw": { }
}
```

#### Exemplo: imagem
```json
{
  "provider": "evolution",
  "mode": "baileys",
  "event": "message",
  "instance": "ismael",
  "wa_chat_id": "555199999999@s.whatsapp.net",
  "wa_message_id": "BAE5D123456",
  "fromMe": false,
  "pushName": "Cliente Teste",
  "timestamp": 1710000000,
  "message": {
    "type": "image",
    "text": null,
    "caption": "Veja essa foto",
    "media": {
      "url": "https://evolution-media-server/media/12345.jpg",
      "mimetype": "image/jpeg"
    }
  },
  "raw": { }
}
```

#### Exemplo: áudio
```json
{
  "provider": "evolution",
  "mode": "baileys",
  "event": "message",
  "instance": "ismael",
  "wa_chat_id": "555199999999@s.whatsapp.net",
  "wa_message_id": "BAE5....",
  "fromMe": false,
  "pushName": "Cliente Teste",
  "timestamp": 1710000000,
  "message": {
    "type": "audio",
    "text": null,
    "caption": null,
    "media": {
      "url": "https://evolution-media-server/media/audio123.ogg",
      "mimetype": "audio/ogg"
    }
  },
  "raw": { }
}
```

> Observação: em alguns eventos de áudio pode faltar `data.key.id` (depende da versão). O n8n pode gerar `noid_<timestamp>` como fallback. Ideal: ajustar para garantir o ID real no Evolution.

---

### 5.2 Status (event = `status`)
**POST** `/chat/status`

```json
{
  "provider": "evolution",
  "mode": "baileys",
  "event": "status",
  "instance": "ismael",
  "wa_chat_id": "555199999999@s.whatsapp.net",
  "wa_message_id": "BAE5F8A2D4B3C1",
  "status": "sent|delivered|read",
  "raw": { }
}
```

Uso no TicketBR:
- Atualizar ticks (✓, ✓✓, ✓✓ azul) na UI
- Atualizar estado de mensagem outbound

---

### 5.3 Presença (event = `presence`)
**POST** `/chat/presence`

```json
{
  "provider": "evolution",
  "mode": "baileys",
  "event": "presence",
  "instance": "ismael",
  "wa_chat_id": "555199999999@s.whatsapp.net",
  "participant": "555199999999@s.whatsapp.net",
  "presence_status": "available|composing|recording|paused",
  "raw": { }
}
```

Uso no TicketBR:
- Mostrar “online”, “digitando…”, “gravando áudio…”

---

## 6. Decisão híbrida (TicketBR → n8n): Plano de Ações

Após receber `/chat/inbound`, o TicketBR deve responder **200** com um objeto JSON que inclui `actions[]`.

### 6.1 Contrato de resposta
```json
{
  "mode": "bot|human|hybrid",
  "handoff": { "required": true, "reason": "user_requested_human|low_confidence|rule" },
  "routing": { "queue": "suporte", "priority": "normal", "assignee": null },
  "actions": [
    { "type": "typing_start", "duration_ms": 900 },
    {
      "type": "send",
      "message": {
        "type": "text|image|audio|video|document",
        "text": "texto",
        "caption": "legenda",
        "media_url": "https://...arquivo",
        "mimetype": "image/jpeg",
        "fileName": "arquivo.jpg",
        "mediatype": "image|video|document",
        "delay": 0,
        "linkPreview": true,
        "quoted_wa_message_id": "BAE5..."
      }
    },
    { "type": "typing_stop" },
    { "type": "mark_read", "wa_message_id": "BAE5..." }
  ],
  "suggestions": [
    { "text": "Sugestão para atendente" }
  ]
}
```

### 6.2 Tipos de action suportados (mínimo)
- `typing_start` (opcional `duration_ms`)
- `typing_stop`
- `mark_read` (opcional `wa_message_id`; se omitir, n8n usa o inbound)
- `send` com `message`

### 6.3 Exemplo: imagem recebida → bot responde + marca como lido
```json
{
  "mode": "hybrid",
  "handoff": { "required": false, "reason": null },
  "routing": { "queue": "comercial", "priority": "normal", "assignee": null },
  "actions": [
    { "type": "typing_start", "duration_ms": 900 },
    {
      "type": "send",
      "message": {
        "type": "text",
        "text": "Recebi a foto. Você quer orçamento desse item? Me diga quantidade e cidade para calcular frete."
      }
    },
    { "type": "typing_stop" },
    { "type": "mark_read" }
  ],
  "suggestions": [
    { "text": "Qual a quantidade e a cidade/CEP?" },
    { "text": "Você prefere retirada ou entrega?" }
  ]
}
```

### 6.4 Exemplo: usuário pede atendente → handoff + mensagem curta de transição
```json
{
  "mode": "hybrid",
  "handoff": { "required": true, "reason": "user_requested_human" },
  "routing": { "queue": "suporte", "priority": "high", "assignee": null },
  "actions": [
    { "type": "typing_start", "duration_ms": 600 },
    {
      "type": "send",
      "message": {
        "type": "text",
        "text": "Certo — vou te encaminhar para um atendente. Só um instante."
      }
    },
    { "type": "typing_stop" },
    { "type": "mark_read" }
  ],
  "suggestions": [
    { "text": "Atendimento assumido. Como posso ajudar?" }
  ]
}
```

### 6.5 Exemplo: “somente sugestão” (humano responde)
```json
{
  "mode": "hybrid",
  "handoff": { "required": true, "reason": "rule" },
  "routing": { "queue": "comercial", "priority": "normal", "assignee": null },
  "actions": [
    { "type": "mark_read" }
  ],
  "suggestions": [
    { "text": "Podemos te passar tabela de preços. Qual modelo você procura?" }
  ]
}
```

---

## 7. Contrato TicketBR → n8n (chamadas diretas) [opcional]

### 7.1 Enviar mensagem
**POST** `https://n8n.strey.com.br/webhook/wa/baileys/send`  
Header: `X-Chat-Token`

#### Body (texto)
```json
{
  "idempotency_key": "ticket-123-msg-1",
  "instance": "ismael",
  "number": "555181754701@s.whatsapp.net",
  "type": "text",
  "text": "Olá! Como posso ajudar?",
  "delay": 0,
  "linkPreview": true,
  "quoted_wa_message_id": "BAE5..."
}
```

#### Body (mídia: imagem/vídeo/documento)
```json
{
  "idempotency_key": "ticket-123-msg-2",
  "instance": "ismael",
  "number": "555181754701@s.whatsapp.net",
  "type": "image",
  "mediatype": "image",
  "mimetype": "image/jpeg",
  "caption": "Segue a imagem",
  "media_url": "https://cdn.seudominio/imagem.jpg",
  "fileName": "imagem.jpg"
}
```

#### Body (áudio PTT)
```json
{
  "idempotency_key": "ticket-123-msg-3",
  "instance": "ismael",
  "number": "555181754701@s.whatsapp.net",
  "type": "audio",
  "media_url": "https://cdn.seudominio/audio.ogg"
}
```

---

### 7.2 Ações (typing/read)
**POST** `https://n8n.strey.com.br/webhook/wa/baileys/action`  
Header: `X-Chat-Token`

#### typing_start
```json
{
  "idempotency_key": "ticket-123-act-1",
  "instance": "ismael",
  "wa_chat_id": "555181754701@s.whatsapp.net",
  "action": "typing_start",
  "params": {}
}
```

#### typing_stop
```json
{
  "idempotency_key": "ticket-123-act-2",
  "instance": "ismael",
  "wa_chat_id": "555181754701@s.whatsapp.net",
  "action": "typing_stop",
  "params": {}
}
```

#### mark_read
```json
{
  "idempotency_key": "ticket-123-act-3",
  "instance": "ismael",
  "wa_chat_id": "555181754701@s.whatsapp.net",
  "action": "mark_read",
  "params": { "wa_message_id": "BAE5..." }
}
```

---

## 8. Como o TicketBR deve modelar conversas/mensagens (recomendado)

### 8.1 Conversas
Chave natural:
- `wa_chat_id` (JID do WhatsApp)

Campos sugeridos:
- `conversation_id` (uuid interno)
- `wa_chat_id`
- `status`: `open|closed`
- `assigned_to`: userId atendente ou null
- `bot_active`: boolean
- `last_message_at`

### 8.2 Mensagens
Chave natural:
- `wa_message_id` (quando existir)
- fallback: `provider_message_fallback_id` (se algum evento vier sem ID)

Campos:
- `direction`: `in|out`
- `type`: `text|image|audio|document|video`
- `text`, `caption`
- `media_url` (estável) e `media_url_original`
- `status`: `sent|delivered|read`

---

## 9. Regras de atendimento híbrido (sugestão de implementação)

### 9.1 Estado por conversa
- `bot_active`:
  - true enquanto não houver atendente ativo ou enquanto IA estiver autorizada a responder
- `human_active`:
  - true quando um atendente assume
- `bot_cooldown_until`:
  - evita IA respondendo logo após humano (ex.: 10 min)

### 9.2 Handoff para humano (gatilhos)
- usuário pediu humano (regex)
- baixa confiança da IA
- mensagens sensíveis (pagamento, cancelamento, LGPD)
- fora de escopo

### 9.3 Quando a IA deve responder
- conversa sem atendente
- conversa em horário fora do expediente (bot triagem)
- conversa com “modo assistente” habilitado

### 9.4 Quando a IA só sugere
- atendente ativo
- cliente VIP
- baixa confiança mas ainda útil sugerir perguntas

---

## 10. Mídia (boas práticas)
`imageMessage.url` e afins podem ser temporários.

Recomendação:
1) TicketBR armazena `media_url_original`
2) Um worker (n8n Workflow 3) baixa e salva em storage estável (S3/MinIO)
3) TicketBR recebe:
- `POST /chat/media-ready` com `stable_url`
4) TicketBR atualiza a mensagem e usa `stable_url` na UI e em reenvios

---

## 11. Checklist de produção
- [ ] Variáveis n8n: `EVOLUTION_APIKEY`, `CHAT_TOKEN`
- [ ] Webhook inbound do Evolution aponta para `/wa/baileys/inbound`
- [ ] TicketBR implementou endpoints:
  - [ ] `/chat/inbound` (responde com `actions[]`)
  - [ ] `/chat/status`
  - [ ] `/chat/presence`
- [ ] Logs/correlation:
  - [ ] registrar `wa_chat_id`, `wa_message_id`, `instance`
- [ ] Idempotência:
  - [ ] `idempotency_key` nos envios e actions (se TicketBR chamar direto)
- [ ] Observabilidade:
  - [ ] armazenar `raw` (ao menos por X dias) para debug

---

## 12. FAQ rápido
**1) Preciso chamar `/send` e `/action` do TicketBR?**  
Não necessariamente. O fluxo padrão é: TicketBR responde no `/chat/inbound` com `actions[]` e o n8n executa.

**2) Como “digitando…” funciona?**  
TicketBR retorna `typing_start` + `duration_ms`, n8n chama Evolution `/chat/sendPresence` com `presence=composing`, espera, e envia mensagem.

**3) Como garantir que o bot não responda quando humano assumiu?**  
No TicketBR: mantenha `bot_active=false` e responda `/chat/inbound` sem actions do tipo `send` (apenas suggestions/routing).

