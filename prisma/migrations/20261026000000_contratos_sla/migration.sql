-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SlaTermScope" AS ENUM ('TIPO_TICKET', 'CATEGORIA', 'PRIORIDADE', 'GLOBAL');

-- CreateEnum
CREATE TYPE "SlaSource" AS ENUM ('MANUAL', 'CONTRACT_TERM', 'CONTRACT', 'GLOBAL_POLICY', 'TICKET_TYPE', 'FALLBACK');

-- CreateEnum
CREATE TYPE "ServiceBlockReason" AS ENUM ('CONTRATO_CANCELADO', 'CONTRATO_VENCIDO', 'CONTRATO_SUSPENSO', 'MANUAL');

-- AlterTable
ALTER TABLE "Solicitante" ADD COLUMN     "contrato_vigente_id" TEXT,
ADD COLUMN     "servico_bloqueado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "servico_bloqueado_em" TIMESTAMP(3),
ADD COLUMN     "servico_bloqueado_motivo" "ServiceBlockReason";

-- AlterTable
ALTER TABLE "Tipo_Ticket" ALTER COLUMN "sla_horas" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "contrato_id" TEXT,
ADD COLUMN     "fora_de_contrato" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sla_fonte" "SlaSource",
ADD COLUMN     "sla_horas_aplicadas" INTEGER;

-- CreateTable
CREATE TABLE "sla_policies" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sla_resposta_horas" INTEGER,
    "sla_solucao_horas" INTEGER NOT NULL,
    "alerta_atencao_pct" INTEGER NOT NULL DEFAULT 70,
    "alerta_critico_pct" INTEGER NOT NULL DEFAULT 85,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "numero" VARCHAR(60) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descricao" TEXT,
    "solicitante_id" TEXT,
    "sla_policy_id" TEXT,
    "sla_resposta_horas" INTEGER,
    "sla_solucao_horas" INTEGER,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "inicio_vigencia" TIMESTAMP(3) NOT NULL,
    "fim_vigencia" TIMESTAMP(3),
    "renovacao_automatica" BOOLEAN NOT NULL DEFAULT false,
    "dias_aviso_vencimento" INTEGER[] DEFAULT ARRAY[30, 15, 7]::INTEGER[],
    "valor_mensal" DECIMAL(12,2),
    "penalidade_descricao" TEXT,
    "documento_url" TEXT,
    "observacoes" TEXT,
    "cancelado_em" TIMESTAMP(3),
    "cancelado_por" TEXT,
    "motivo_cancelamento" TEXT,
    "renovado_de_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_sla_termos" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "escopo" "SlaTermScope" NOT NULL,
    "tipo_ticket_id" TEXT,
    "categoria_id" TEXT,
    "prioridade" "TicketPriority",
    "sla_resposta_horas" INTEGER,
    "sla_solucao_horas" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "contrato_sla_termos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sla_policies_is_default_ativo_idx" ON "sla_policies"("is_default", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_numero_key" ON "contratos"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_renovado_de_id_key" ON "contratos"("renovado_de_id");

-- CreateIndex
CREATE INDEX "contratos_solicitante_id_status_idx" ON "contratos"("solicitante_id", "status");

-- CreateIndex
CREATE INDEX "contratos_status_fim_vigencia_idx" ON "contratos"("status", "fim_vigencia");

-- CreateIndex
CREATE INDEX "contrato_sla_termos_contrato_id_ativo_idx" ON "contrato_sla_termos"("contrato_id", "ativo");

-- CreateIndex
CREATE INDEX "contrato_sla_termos_tipo_ticket_id_idx" ON "contrato_sla_termos"("tipo_ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "Solicitante_contrato_vigente_id_key" ON "Solicitante"("contrato_vigente_id");

-- CreateIndex
CREATE INDEX "Solicitante_servico_bloqueado_idx" ON "Solicitante"("servico_bloqueado");

-- CreateIndex
CREATE INDEX "Ticket_contrato_id_idx" ON "Ticket"("contrato_id");

-- CreateIndex
CREATE INDEX "Ticket_fora_de_contrato_idx" ON "Ticket"("fora_de_contrato");

-- AddForeignKey
ALTER TABLE "Solicitante" ADD CONSTRAINT "Solicitante_contrato_vigente_id_fkey" FOREIGN KEY ("contrato_vigente_id") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "Solicitante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_sla_policy_id_fkey" FOREIGN KEY ("sla_policy_id") REFERENCES "sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_renovado_de_id_fkey" FOREIGN KEY ("renovado_de_id") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_sla_termos" ADD CONSTRAINT "contrato_sla_termos_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_sla_termos" ADD CONSTRAINT "contrato_sla_termos_tipo_ticket_id_fkey" FOREIGN KEY ("tipo_ticket_id") REFERENCES "Tipo_Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_sla_termos" ADD CONSTRAINT "contrato_sla_termos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "Categoria_Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
