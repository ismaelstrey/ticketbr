import KanbanBoard from "@/components/kanban/KanbanBoard";
import { UserHeader } from "@/components/layout/UserHeader";

export default function Home() {
  return (
    <main>
      <UserHeader />
      <KanbanBoard />
    </main>
  );
}
