-- Comentários de tarefas: histórico de discussão vinculado à tarefa e ao autor.

CREATE TABLE "task_comments" (
  "id" text NOT NULL,
  "task_id" text NOT NULL,
  "author_id" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_comments_task_id_created_at_idx" ON "task_comments"("task_id", "created_at");

ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
