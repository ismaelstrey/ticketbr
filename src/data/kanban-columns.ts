import { KanbanColumn } from "@/types/ticket";

export const columns: KanbanColumn[] = [
  { key: "todo", title: "A fazer", color: "#ff5d5d" },
  { key: "doing", title: "Atendendo", color: "#69cf57" },
  { key: "paused", title: "Pausado", color: "#f2c445" },
  { key: "done", title: "Finalizado", color: "#8e8e8e" }
];
