CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');
CREATE TYPE "TaskPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

CREATE TABLE "Task" (
  "id" text NOT NULL,
  "title" character varying(180) NOT NULL,
  "description" text,
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
  "sort_order" double precision NOT NULL DEFAULT 0,
  "due_at" timestamptz,
  "completed_at" timestamptz,
  "assignee_id" text,
  "created_by_id" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskSubtask" (
  "id" text NOT NULL,
  "task_id" text NOT NULL,
  "title" character varying(220) NOT NULL,
  "is_done" boolean NOT NULL DEFAULT false,
  "sort_order" double precision NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL,
  CONSTRAINT "TaskSubtask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskAttachment" (
  "id" text NOT NULL,
  "task_id" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text,
  "file_size" integer,
  "data" bytea NOT NULL,
  "created_by_id" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskTicketLink" (
  "id" text NOT NULL,
  "task_id" text NOT NULL,
  "ticket_id" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "TaskTicketLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskTicketLink_task_id_ticket_id_key" ON "TaskTicketLink"("task_id", "ticket_id");
CREATE INDEX "Task_status_sortOrder_idx" ON "Task"("status", "sort_order");
CREATE INDEX "Task_dueAt_idx" ON "Task"("due_at");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assignee_id");
CREATE INDEX "Task_createdById_idx" ON "Task"("created_by_id");
CREATE INDEX "TaskSubtask_task_idx" ON "TaskSubtask"("task_id", "sort_order");
CREATE INDEX "TaskAttachment_task_idx" ON "TaskAttachment"("task_id");
CREATE INDEX "TaskTicketLink_ticket_idx" ON "TaskTicketLink"("ticket_id");

ALTER TABLE "Task" ADD CONSTRAINT "Task_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskSubtask" ADD CONSTRAINT "TaskSubtask_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskTicketLink" ADD CONSTRAINT "TaskTicketLink_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

