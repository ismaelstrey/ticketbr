# Documentação da API TicketBR

## Autenticação

A autenticação é feita via JWT armazenado em cookies HTTP-only.

### POST /api/auth/login
Realiza login e define o cookie de sessão.
- **Body**: `{ email, password }`
- **Response**: `{ message, user: { id, name, email, role } }`

### GET /api/auth/me
Retorna o usuário logado.
- **Response**: `{ user: { sub, name, email, role } }` ou 401.

### POST /api/auth/me
Realiza logout (remove o cookie).

## Tickets

### GET /api/tickets
Lista todos os tickets.
- **Response**: `{ data: Ticket[] }`

### GET /api/tickets/:id
Obtém detalhes de um ticket.
- **Response**: `{ data: Ticket }`

### PATCH /api/tickets/:id
Atualiza um ticket.
- **Body**: `{ status, prioridade, ... }` (campos parciais)
- **Response**: `{ data: Ticket }`

### POST /api/tickets/:id/status
Atualiza apenas o status de um ticket.
- **Body**: `{ status: "todo" | "doing" | "paused" | "done", pauseReason?: string }`
- **Response**: `{ data: Ticket }`

## Usuários

### GET /api/users
Lista usuários do sistema (agentes/admins).
- **Response**: `User[]`

## Tipos

```typescript
type TicketStatus = "todo" | "doing" | "paused" | "done";
type TicketPriority = "Alta" | "Média" | "Sem prioridade";

interface Ticket {
  id: string;
  number: number;
  empresa: string;
  solicitante: string;
  assunto: string;
  status: TicketStatus;
  prioridade: TicketPriority;
  // ... outros campos
}
```
