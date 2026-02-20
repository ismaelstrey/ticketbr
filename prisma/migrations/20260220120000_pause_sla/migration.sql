-- AlterTable
ALTER TABLE "Ticket"
ADD COLUMN     "pauseSla" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pausedStartedAt" TIMESTAMP(3),
ADD COLUMN     "pausedTotalSeconds" INTEGER NOT NULL DEFAULT 0;
