-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "categoria_id" TEXT,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "mesa_trabalho_id" TEXT,
ADD COLUMN     "operador_atual_id" TEXT,
ADD COLUMN     "solicitante_id" TEXT,
ADD COLUMN     "tipo_ticket_id" TEXT,
ADD COLUMN     "updated_by" TEXT,
ALTER COLUMN "company" DROP NOT NULL,
ALTER COLUMN "requester" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL DEFAULT 'default_hash';

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
CREATE TABLE "Tipo_Ticket" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,
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
    "descricao" TEXT,
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
    "localizacao" VARCHAR(255),
    "capacidade" INTEGER,
    "tipo" VARCHAR(50),
    "responsavel_id" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
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
    "perfil" VARCHAR(50),
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

-- CreateIndex
CREATE UNIQUE INDEX "Solicitante_cnpj_key" ON "Solicitante"("cnpj");

-- CreateIndex
CREATE INDEX "Solicitante_cnpj_idx" ON "Solicitante"("cnpj");

-- CreateIndex
CREATE INDEX "Solicitante_email_idx" ON "Solicitante"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tipo_Ticket_nome_key" ON "Tipo_Ticket"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_Ticket_tipo_ticket_id_nome_key" ON "Categoria_Ticket"("tipo_ticket_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Operador_email_key" ON "Operador"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Operador_matricula_key" ON "Operador"("matricula");

-- AddForeignKey
ALTER TABLE "Categoria_Ticket" ADD CONSTRAINT "Categoria_Ticket_tipo_ticket_id_fkey" FOREIGN KEY ("tipo_ticket_id") REFERENCES "Tipo_Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mesa_Trabalho" ADD CONSTRAINT "Mesa_Trabalho_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "Operador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operador" ADD CONSTRAINT "Operador_mesa_trabalho_id_fkey" FOREIGN KEY ("mesa_trabalho_id") REFERENCES "Mesa_Trabalho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "Solicitante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tipo_ticket_id_fkey" FOREIGN KEY ("tipo_ticket_id") REFERENCES "Tipo_Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "Categoria_Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_mesa_trabalho_id_fkey" FOREIGN KEY ("mesa_trabalho_id") REFERENCES "Mesa_Trabalho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_operador_atual_id_fkey" FOREIGN KEY ("operador_atual_id") REFERENCES "Operador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
