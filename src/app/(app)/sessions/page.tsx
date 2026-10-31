import { PageHeader } from "@/components/layout/page-header";
import { CreateSessionForm } from "@/components/sessions/create-session-form";
import {
  SessionsBoard,
  type SessionListItem,
} from "@/components/sessions/sessions-board";
import { getTasks } from "@/lib/db/tasks";
import {
  calculateSessionProgress,
  getLinkedTasksBySessionIds,
  getSessionItemsBySessionIds,
  getSessions,
} from "@/lib/db/sessions";

export default async function SessionsPage() {
  const [sessions, officeTasks, personalTasks] = await Promise.all([
    getSessions(),
    getTasks("office"),
    getTasks("personal"),
  ]);

  const allTasks = [...officeTasks, ...personalTasks];
  const sessionIds = sessions.map((session) => session.id);
  const [items, linkedTasksBySession] = await Promise.all([
    getSessionItemsBySessionIds(sessionIds),
    getLinkedTasksBySessionIds(sessionIds),
  ]);

  const itemsBySession = new Map<string, typeof items>();
  for (const item of items) {
    const existing = itemsBySession.get(item.session_id) ?? [];
    existing.push(item);
    itemsBySession.set(item.session_id, existing);
  }

  const listItems: SessionListItem[] = sessions.map((session) => {
    const sessionItems = itemsBySession.get(session.id) ?? [];
    const leaves = sessionItems.filter(
      (item) => !sessionItems.some((other) => other.parent_item_id === item.id)
    );
    const countable = leaves.length > 0 ? leaves : sessionItems.filter((i) => !i.parent_item_id);
    const doneCount = countable.filter((item) => item.status === "done").length;

    return {
      id: session.id,
      title: session.title,
      status: session.status,
      progress: calculateSessionProgress(sessionItems),
      itemCount: countable.length,
      doneCount,
      linkedTaskTitles: (linkedTasksBySession.get(session.id) ?? []).map(
        (task) => task.title
      ),
      createdAt: session.created_at,
    };
  });

  return (
    <>
      <PageHeader
        title="Sessions"
        description="Hourly checklists for quick focus work. Carry unfinished items into your next session."
        actions={
          <CreateSessionForm tasks={allTasks} existingSessions={sessions} />
        }
      />

      <div className="flex min-w-0 flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 animate-fade-in">
        <SessionsBoard sessions={listItems} />
      </div>
    </>
  );
}
