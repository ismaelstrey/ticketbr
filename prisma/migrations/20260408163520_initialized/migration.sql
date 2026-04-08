-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "due_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TaskAttachment" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TaskSubtask" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TaskTicketLink" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- RenameIndex
ALTER INDEX "Task_assigneeId_idx" RENAME TO "Task_assignee_id_idx";

-- RenameIndex
ALTER INDEX "Task_createdById_idx" RENAME TO "Task_created_by_id_idx";

-- RenameIndex
ALTER INDEX "Task_dueAt_idx" RENAME TO "Task_due_at_idx";

-- RenameIndex
ALTER INDEX "Task_status_sortOrder_idx" RENAME TO "Task_status_sort_order_idx";

-- RenameIndex
ALTER INDEX "TaskAttachment_task_idx" RENAME TO "TaskAttachment_task_id_idx";

-- RenameIndex
ALTER INDEX "TaskSubtask_task_idx" RENAME TO "TaskSubtask_task_id_sort_order_idx";

-- RenameIndex
ALTER INDEX "TaskTicketLink_ticket_idx" RENAME TO "TaskTicketLink_ticket_id_idx";

-- RenameIndex
ALTER INDEX "audit_logs_actor_created_at_idx" RENAME TO "audit_logs_actor_user_id_created_at_idx";

-- RenameIndex
ALTER INDEX "audit_logs_solicitante_created_at_idx" RENAME TO "audit_logs_solicitante_id_created_at_idx";
