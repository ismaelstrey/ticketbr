export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

export type TaskAssignee = { id: string; name: string; email?: string | null };

export type TaskTicketLink = { id: string; ticketId: string };

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  sortOrder: number;
  dueAt: string | null;
  completedAt: string | null;
  assigneeId: string | null;
  assignee?: TaskAssignee | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  ticketLinks?: TaskTicketLink[];
  subtasks?: Array<{ id: string; isDone: boolean }>;
};

