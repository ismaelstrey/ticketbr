-- Etapa 2 da migração dos campos legados do Ticket.
--
-- Após o backfill (20260409000000_backfill_ticket_relations) e a virada da leitura
-- para as relações (solicitante, tipo_ticket, categoria, mesa_trabalho_rel, operador_rel),
-- as colunas de texto/relação legadas deixam de ter uso e são removidas definitivamente.
--
-- Observação: ao remover a coluna "operatorId" a constraint de FK associada
-- ("Ticket_operatorId_fkey") é removida automaticamente pelo Postgres.
ALTER TABLE "Ticket"
  DROP COLUMN IF EXISTS "company",
  DROP COLUMN IF EXISTS "requester",
  DROP COLUMN IF EXISTS "operator",
  DROP COLUMN IF EXISTS "operatorId",
  DROP COLUMN IF EXISTS "ticketType",
  DROP COLUMN IF EXISTS "category",
  DROP COLUMN IF EXISTS "workbench";
