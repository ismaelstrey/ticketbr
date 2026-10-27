-- Adiciona tipo de evento neutro para mensagens de chat (WhatsApp).
-- Não participa do cálculo de SLA de resposta (apenas COMMENT/NOTE contam).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TicketEventType' AND e.enumlabel = 'CHAT_MESSAGE'
  ) THEN
    ALTER TYPE "TicketEventType" ADD VALUE 'CHAT_MESSAGE';
  END IF;
END $$;
