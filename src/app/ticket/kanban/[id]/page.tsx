import KanbanBoard from "@/components/kanban/KanbanBoard";

export default async function TicketKanbanTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main>
      <KanbanBoard initialTicketId={id} />
    </main>
  );
}
