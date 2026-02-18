/*
  Warnings:

  - You are about to drop the column `operador_atual_id` on the `Ticket` table. All the data in the column will be lost.
  - Made the column `descricao` on table `Categoria_Ticket` required. This step will fail if there are existing NULL values in that column.
  - Made the column `localizacao` on table `Mesa_Trabalho` required. This step will fail if there are existing NULL values in that column.
  - Made the column `capacidade` on table `Mesa_Trabalho` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tipo` on table `Mesa_Trabalho` required. This step will fail if there are existing NULL values in that column.
  - Made the column `perfil` on table `Operador` required. This step will fail if there are existing NULL values in that column.
  - Made the column `descricao` on table `Tipo_Ticket` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_categoria_id_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_mesa_trabalho_id_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_operador_atual_id_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_solicitante_id_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_tipo_ticket_id_fkey";

-- AlterTable
ALTER TABLE "Categoria_Ticket" ALTER COLUMN "descricao" SET NOT NULL;

-- AlterTable
ALTER TABLE "Mesa_Trabalho" ALTER COLUMN "localizacao" SET NOT NULL,
ALTER COLUMN "capacidade" SET NOT NULL,
ALTER COLUMN "tipo" SET NOT NULL;

-- AlterTable
ALTER TABLE "Operador" ALTER COLUMN "perfil" SET NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "operador_atual_id",
ADD COLUMN     "operador_id" TEXT;

-- AlterTable
ALTER TABLE "Tipo_Ticket" ALTER COLUMN "descricao" SET NOT NULL;

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
