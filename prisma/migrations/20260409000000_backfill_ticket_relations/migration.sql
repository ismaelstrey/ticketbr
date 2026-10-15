-- Backfill dos relacionamentos do Ticket a partir dos campos legados em texto.
-- Etapa 1 da remoção dos campos legados: garante que os relacionamentos
-- (tipo_ticket_id, categoria_id, mesa_trabalho_id, operador_id) estejam
-- preenchidos antes de a aplicação passar a lê-los como fonte de verdade.
-- A coluna solicitante_id já possui backfill na migration 20260322020000.

-- Tipo de ticket
UPDATE "Ticket" t
SET "tipo_ticket_id" = tt."id"
FROM "Tipo_Ticket" tt
WHERE t."tipo_ticket_id" IS NULL
  AND t."ticketType" IS NOT NULL
  AND lower(trim(t."ticketType")) = lower(trim(tt."nome"));

-- Categoria (preferindo a categoria do mesmo tipo de ticket)
UPDATE "Ticket" t
SET "categoria_id" = c."id"
FROM "Categoria_Ticket" c
WHERE t."categoria_id" IS NULL
  AND t."category" IS NOT NULL
  AND lower(trim(t."category")) = lower(trim(c."nome"))
  AND (t."tipo_ticket_id" IS NULL OR c."tipo_ticket_id" = t."tipo_ticket_id");

-- Categoria (fallback: qualquer categoria com o mesmo nome)
UPDATE "Ticket" t
SET "categoria_id" = c."id"
FROM "Categoria_Ticket" c
WHERE t."categoria_id" IS NULL
  AND t."category" IS NOT NULL
  AND lower(trim(t."category")) = lower(trim(c."nome"));

-- Mesa de trabalho
UPDATE "Ticket" t
SET "mesa_trabalho_id" = m."id"
FROM "Mesa_Trabalho" m
WHERE t."mesa_trabalho_id" IS NULL
  AND t."workbench" IS NOT NULL
  AND lower(trim(t."workbench")) = lower(trim(m."nome"));

-- Operador
UPDATE "Ticket" t
SET "operador_id" = o."id"
FROM "Operador" o
WHERE t."operador_id" IS NULL
  AND t."operator" IS NOT NULL
  AND lower(trim(t."operator")) = lower(trim(o."nome"));
