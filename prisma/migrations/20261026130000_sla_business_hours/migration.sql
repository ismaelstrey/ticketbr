-- AlterTable
-- Horário comercial + feriados na política global de SLA (cálculo em horas úteis)
ALTER TABLE "sla_policies" ADD COLUMN "horario_comercial_ativo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sla_policies" ADD COLUMN "horario_comercial" JSONB;
ALTER TABLE "sla_policies" ADD COLUMN "feriados" JSONB;
