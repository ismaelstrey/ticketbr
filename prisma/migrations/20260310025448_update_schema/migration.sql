-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('TODO', 'DOING', 'PAUSED', 'DONE');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('HIGH', 'MEDIUM', 'NONE');

-- CreateEnum
CREATE TYPE "TicketEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'PAUSED', 'COMMENT', 'NOTE', 'ASSIGNED', 'SLA_UPDATED', 'UPDATED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT', 'CUSTOMER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT 'default_hash',
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "whatsappId" TEXT,
    "remoteJid" TEXT,
    "pushName" TEXT,
    "profilePicUrl" TEXT,
    "instanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_contacts" (
    "id" TEXT NOT NULL,
    "remote_jid" TEXT NOT NULL,
    "push_name" TEXT,
    "profile_pic_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "instance_id" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solicitante" (
    "id" TEXT NOT NULL,
    "razao_social" VARCHAR(255) NOT NULL,
    "nome_fantasia" VARCHAR(255) NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "endereco_completo" TEXT NOT NULL,
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Solicitante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funcionario" (
    "id" TEXT NOT NULL,
    "solicitante_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "telefone" VARCHAR(20) NOT NULL,
    "whatsappId" TEXT,
    "remoteJid" TEXT,
    "pushName" TEXT,
    "profilePicUrl" TEXT,
    "instanceId" TEXT,
    "whatsapp_contact_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tipo_Ticket" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT NOT NULL,
    "sla_horas" INTEGER NOT NULL,
    "prioridade_default" VARCHAR(20) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Tipo_Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria_Ticket" (
    "id" TEXT NOT NULL,
    "tipo_ticket_id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Categoria_Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mesa_Trabalho" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "localizacao" VARCHAR(255) NOT NULL,
    "capacidade" INTEGER NOT NULL,
    "responsavel_id" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "tipo" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Mesa_Trabalho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operador" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "matricula" VARCHAR(50) NOT NULL,
    "perfil" VARCHAR(50) NOT NULL,
    "mesa_trabalho_id" TEXT,
    "is_tecnico" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acesso" TIMESTAMP(3),
    "especialidade" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Operador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "solicitante_id" TEXT,
    "tipo_ticket_id" TEXT,
    "categoria_id" TEXT,
    "mesa_trabalho_id" TEXT,
    "operador_id" TEXT,
    "company" TEXT,
    "requester" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NONE',
    "operator" TEXT,
    "operatorId" TEXT,
    "createdByUserId" TEXT,
    "contact" TEXT,
    "ticketType" TEXT,
    "category" TEXT,
    "workbench" TEXT,
    "responseSlaAt" TIMESTAMP(3),
    "solutionSlaAt" TIMESTAMP(3),
    "pausedReason" TEXT,
    "pauseSla" BOOLEAN NOT NULL DEFAULT false,
    "pausedStartedAt" TIMESTAMP(3),
    "pausedTotalSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEvent" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" "TicketEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fromStatus" "TicketStatus",
    "toStatus" "TicketStatus",
    "pauseReason" TEXT,
    "metadata" JSONB,
    "author" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_whatsappId_key" ON "User"("whatsappId");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_remote_jid_idx" ON "whatsapp_contacts"("remote_jid");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_instance_id_idx" ON "whatsapp_contacts"("instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "Solicitante_cnpj_key" ON "Solicitante"("cnpj");

-- CreateIndex
CREATE INDEX "Solicitante_cnpj_idx" ON "Solicitante"("cnpj");

-- CreateIndex
CREATE INDEX "Solicitante_email_idx" ON "Solicitante"("email");

-- CreateIndex
CREATE INDEX "Solicitante_telefone_idx" ON "Solicitante"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_userId_key" ON "Funcionario"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_whatsappId_key" ON "Funcionario"("whatsappId");

-- CreateIndex
CREATE INDEX "Funcionario_solicitante_id_idx" ON "Funcionario"("solicitante_id");

-- CreateIndex
CREATE INDEX "Funcionario_telefone_idx" ON "Funcionario"("telefone");

-- CreateIndex
CREATE INDEX "Funcionario_whatsapp_contact_id_idx" ON "Funcionario"("whatsapp_contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_solicitante_id_telefone_key" ON "Funcionario"("solicitante_id", "telefone");

-- CreateIndex
CREATE UNIQUE INDEX "Tipo_Ticket_nome_key" ON "Tipo_Ticket"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_Ticket_tipo_ticket_id_nome_key" ON "Categoria_Ticket"("tipo_ticket_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Operador_email_key" ON "Operador"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Operador_matricula_key" ON "Operador"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_number_key" ON "Ticket"("number");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "Ticket_solicitante_id_idx" ON "Ticket"("solicitante_id");

-- CreateIndex
CREATE INDEX "Ticket_createdByUserId_idx" ON "Ticket"("createdByUserId");

-- CreateIndex
CREATE INDEX "TicketEvent_ticketId_createdAt_idx" ON "TicketEvent"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketEvent_type_idx" ON "TicketEvent"("type");

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "Solicitante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_whatsapp_contact_id_fkey" FOREIGN KEY ("whatsapp_contact_id") REFERENCES "whatsapp_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria_Ticket" ADD CONSTRAINT "Categoria_Ticket_tipo_ticket_id_fkey" FOREIGN KEY ("tipo_ticket_id") REFERENCES "Tipo_Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mesa_Trabalho" ADD CONSTRAINT "Mesa_Trabalho_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "Operador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operador" ADD CONSTRAINT "Operador_mesa_trabalho_id_fkey" FOREIGN KEY ("mesa_trabalho_id") REFERENCES "Mesa_Trabalho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "Solicitante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tipo_ticket_id_fkey" FOREIGN KEY ("tipo_ticket_id") REFERENCES "Tipo_Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "Categoria_Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_mesa_trabalho_id_fkey" FOREIGN KEY ("mesa_trabalho_id") REFERENCES "Mesa_Trabalho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "Operador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
