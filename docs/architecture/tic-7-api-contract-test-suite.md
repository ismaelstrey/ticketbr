# TIC-7 - Suite de Testes de Contrato para APIs Criticas

## Objetivo

Estabelecer uma suite dedicada para validar contratos HTTP minimos dos endpoints criticos do TicketBR, reduzindo regressao de integracao entre backend, frontend e consumidores externos.

## Escopo da Suite

- `POST /api/auth/login`
- `GET/POST /api/tickets`
- `GET/POST /api/customer/tickets`
- `GET/POST /api/projects`
- `POST /api/chat/messages`
- `POST /api/storage/upload-url`

Implementacao em:

- `src/test/contracts/**/*.contract.test.ts`
- `src/test/contracts/schemas.ts`

## Contratos Minimos Verificados

- Status code esperado por cenario critico (sucesso e erro principal).
- Estrutura de payload de sucesso e erro (envelope com `data` ou `error`).
- Headers obrigatorios para autenticacao/rate-limit/request tracking quando aplicavel.

## Gate Obrigatorio

- Comando dedicado: `npm run test:contract`
- Execucao no CI: `.github/workflows/ci.yml` (step `Contract Test`)
- Checklist de PR atualizado: `.github/pull_request_template.md`

## Criterio de Aprovacao

- Suite `test:contract` verde.
- Sem breaking change de payload/status nos endpoints cobertos sem atualizacao explicita de contrato e comunicacao no PR.
