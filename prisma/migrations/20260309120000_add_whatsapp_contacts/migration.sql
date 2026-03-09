CREATE TABLE IF NOT EXISTS "whatsapp_contacts" (
  "id" TEXT NOT NULL,
  "remote_jid" TEXT NOT NULL,
  "push_name" TEXT,
  "profile_pic_url" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "instance_id" TEXT,
  "synced_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_whatsapp_contacts_remote_jid" ON "whatsapp_contacts"("remote_jid");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_contacts_instance_id" ON "whatsapp_contacts"("instance_id");
