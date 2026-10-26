-- AlterEnum
-- Notificações do ciclo de vida de contratos
ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_CANCELLED';
