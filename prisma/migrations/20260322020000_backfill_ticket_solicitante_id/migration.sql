UPDATE "Ticket" t
SET "solicitante_id" = s."id"
FROM "Solicitante" s
WHERE t."solicitante_id" IS NULL
  AND (
    lower(trim(coalesce(t."company", ''))) = lower(trim(coalesce(s."nome_fantasia", '')))
    OR lower(trim(coalesce(t."company", ''))) = lower(trim(coalesce(s."razao_social", '')))
    OR lower(trim(coalesce(t."requester", ''))) = lower(trim(coalesce(s."nome_fantasia", '')))
    OR lower(trim(coalesce(t."requester", ''))) = lower(trim(coalesce(s."razao_social", '')))
  );

