import KanbanBoard from "@/components/KanbanBoard";
import UserHeader from "@/components/UserHeader";

export default function Home() {
  return (
    <main>
      <UserHeader />
      <KanbanBoard />
    </main>
  );
}
