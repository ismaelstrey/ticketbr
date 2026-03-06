/*
  Warnings:

  - A unique constraint covering the columns `[whatsappId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "instanceId" TEXT,
ADD COLUMN     "profilePicUrl" TEXT,
ADD COLUMN     "pushName" TEXT,
ADD COLUMN     "remoteJid" TEXT,
ADD COLUMN     "whatsappId" TEXT;

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_userId_key" ON "Funcionario"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_whatsappId_key" ON "Funcionario"("whatsappId");

-- CreateIndex
CREATE INDEX "Funcionario_solicitante_id_idx" ON "Funcionario"("solicitante_id");

-- CreateIndex
CREATE INDEX "Funcionario_telefone_idx" ON "Funcionario"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_solicitante_id_telefone_key" ON "Funcionario"("solicitante_id", "telefone");

-- CreateIndex
CREATE INDEX "Solicitante_telefone_idx" ON "Solicitante"("telefone");

-- CreateIndex
CREATE INDEX "Ticket_solicitante_id_idx" ON "Ticket"("solicitante_id");

-- CreateIndex
CREATE INDEX "Ticket_createdByUserId_idx" ON "Ticket"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_whatsappId_key" ON "User"("whatsappId");

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "Solicitante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
