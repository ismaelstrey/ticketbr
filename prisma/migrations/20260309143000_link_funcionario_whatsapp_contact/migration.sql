ALTER TABLE "Funcionario"
ADD COLUMN IF NOT EXISTS "whatsapp_contact_id" TEXT;

CREATE INDEX IF NOT EXISTS "Funcionario_whatsapp_contact_id_idx"
ON "Funcionario"("whatsapp_contact_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Funcionario_whatsapp_contact_id_fkey'
      AND table_name = 'Funcionario'
  ) THEN
    ALTER TABLE "Funcionario"
    ADD CONSTRAINT "Funcionario_whatsapp_contact_id_fkey"
    FOREIGN KEY ("whatsapp_contact_id") REFERENCES "whatsapp_contacts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
