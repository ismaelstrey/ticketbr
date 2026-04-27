# TicketBR

## Cadastros \u2192 Solicitantes

- Acesso: `/cadastros/solicitante`
- Funcionalidades: listar, buscar, ordenar, paginar (10/25/50), criar, editar e excluir (soft delete via `status=false`).

### API (Solicitantes)

- `GET /api/solicitantes?page=1&pageSize=10&search=&sortBy=data_cadastro&sortDir=desc`
  - Retorna `{ data, total, page, pageSize }`
- `POST /api/solicitantes`
  - Body: `{ nome, cpfCnpj, email, telefone, enderecoCompleto }`
- `PUT /api/solicitantes/:id`
  - Body parcial: mesmos campos do POST
- `DELETE /api/solicitantes/:id`

Observações:

- CPF/CNPJ: aceita 11 (CPF) ou 14 (CNPJ) dígitos.
- Operações dependem de sessão autenticada (cookie) quando o middleware estiver ativo.

## Testes

- Unit tests: `npm test`
- Watch: `npm run test:watch`

## Desenvolvimento

- Subir app: `npm run dev`
- Aplicar migrations: `npm run prisma:migrate`
- Seed: `npm run seed`

## Build/Deploy

- O `postbuild` não executa migration por padrão.
- Para executar migration no pipeline de build, defina `RUN_DB_MIGRATE_ON_BUILD=true`.

## Segurança / CORS

- O `Access-Control-Allow-Origin` da API é controlado por `CORS_ALLOW_ORIGIN` (fallback: `http://localhost:3000`).
- O projeto usa `allowedDevOrigins` para permitir chamadas de `localhost` e `127.0.0.1` em desenvolvimento.

/home/ismael/dev/ticketbr

