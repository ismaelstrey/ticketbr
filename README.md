# TicketBR

## Documentação

- **Operacional** (`docs/operacional/`):
  - [Guia de deploy](docs/operacional/guia-deploy.md) — pipeline, variáveis de ambiente, migrations, crons e rollback.
  - [Backup e restore](docs/operacional/backup-restore.md) — política de backup e procedimentos de restauração do PostgreSQL.
  - [Runbook de incidentes](docs/operacional/runbook-incidentes.md) — triagem e playbooks por tipo de incidente.

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

## Notificações

- Os disparos passam pelo serviço `src/server/services/notifications.ts` (in-app + e-mail), com `dedupeKey` para varreduras idempotentes.
- As preferências ficam em **Configurações → Notificações** (`/settings`), persistidas na tabela `app_runtime_settings` (chave `notification_preferences`) via `/api/settings/notification-preferences`.
- É possível ligar/desligar os canais **in-app** e **e-mail** e cada evento (mudança de status, comentário, atribuição, SLA próximo e SLA estourado).
- Eventos desativados não geram registro in-app nem envio de e-mail.

## Tarefas

- Comentários por tarefa em `/tasks/[id]` (tabela `task_comments`), com autoria. A exclusão é permitida ao autor do comentário ou a um usuário `ADMIN`.

## Inventário de infraestrutura

- Acesso: `/infraestrutura` (com seletor de cliente) — visualiza a árvore de ativos do cliente: servidor físico → host de virtualização → VM → container.
- A hierarquia usa o campo `parentId` do modelo `Equipment`; o vínculo só é aceito entre recursos do mesmo cliente e sem ciclos.
- Campos de virtualização em `Equipment`: `virtualizationPlatform`, `managementController` (iLO/iDRAC/IPMI), `managementIp`/`managementUrl`, `url`, `vmid`, `guestOs`, `cpuCores`, `memoryMb`, `diskGb` e `tags`.
- Todo host com `type = HYPERVISOR` exige uma `virtualizationPlatform` (Proxmox, VMware ESXi/vCenter, Hyper-V, XCP-ng, KVM).
- Credenciais do cofre aceitam um link de acesso (`url`); quando ausente, o link é derivado de `hostname`/`ipAddress` + `protocol`/`port` (`loginUrl`) e exibido como botão **Abrir**.
- Busca rápida global com **Ctrl/Cmd + K** (rota `/api/inventory/search`): responde "onde está o recurso?" pelo nome, código, hostname, IP, IP de gerência, VMID, tags ou dados de credenciais, exibindo o caminho completo.

### API (Infraestrutura)

- `GET /api/inventory/tree?solicitanteId=` — retorna `{ data: { solicitante, summary, nodes } }` com a árvore do cliente (ou de todos).
- `GET /api/inventory/search?q=&solicitanteId=&limit=` — retorna `{ data, total }` com os recursos que casam com o termo e o caminho do recurso.
- `POST /api/inventory` e `PUT /api/inventory/:id` — aceitam os campos de virtualização e `parentId` (validado no servidor).

## Portal do cliente

- **Recuperação de senha**: `/cliente/esqueci-senha` solicita o envio do link e `/cliente/redefinir-senha` conclui a troca. O token é de uso único, expira em 1 hora e é persistido apenas como hash em `password_reset_tokens`. O link usa `APP_BASE_URL`.
- **Meus dados**: `/cliente/perfil` permite atualizar o nome e trocar a senha (exige informar a senha atual).

## Desenvolvimento

- Subir app: `npm run dev`
- Aplicar migrations: `npm run prisma:migrate`
- Bootstrap de produção: `npm run seed` — idempotente; cria apenas o administrador e as configurações base (tipos e categorias de ticket + mesa de trabalho). Não gera dados fictícios.
  - Exige `ADMIN_PASSWORD` (mínimo 8 caracteres) — sem essa variável o script aborta.
  - Variáveis opcionais: `ADMIN_EMAIL` (default `admin@ticketbr.com`), `ADMIN_NAME` (default `Administrador`), `ADMIN_MATRICULA` (default `ADM001`).
  - A senha só é aplicada na criação; execuções seguintes não sobrescrevem a senha existente.
- Limpeza de dados: `npm run db:clean` — **dry-run** que lista quantos registros seriam removidos de cada tabela, preservando o admin e as configurações base.
  - Aplicar a limpeza: `npm run db:clean:apply` (remove todos os dados operacionais e reinicia a sequência de numeração de tickets).

## Build/Deploy

- O `postbuild` não executa migration por padrão.
- Para executar migration no pipeline de build, defina `RUN_DB_MIGRATE_ON_BUILD=true`.

## Segurança / CORS

- O `Access-Control-Allow-Origin` da API é controlado por `CORS_ALLOW_ORIGIN` (fallback: `http://localhost:3000`).
- O projeto usa `allowedDevOrigins` para permitir chamadas de `localhost` e `127.0.0.1` em desenvolvimento.

/home/ismael/dev/ticketbr

