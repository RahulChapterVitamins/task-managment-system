import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SessionDetail } from "@/components/sessions/session-detail";
import { Button } from "@/components/ui/button";
import { getTasks } from "@/lib/db/tasks";
import { getSubtasksByTaskIds } from "@/lib/db/subtasks";
import {
  buildSessionItemTree,
  calculateSessionProgress,
  getSession,
  getSessionItems,
  getSessionLinkedTasks,
} from "@/lib/db/sessions";

type SessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);

  if (!session) {
    notFound();
  }

  const [items, officeTasks, personalTasks, linkedTasks] = await Promise.all([
    getSessionItems(sessionId),
    getTasks("office"),
    getTasks("personal"),
    getSessionLinkedTasks(sessionId),
  ]);

  const allTasks =
    linkedTasks.length > 0
      ? linkedTasks
      : [...officeTasks, ...personalTasks].filter((task) => task.status !== "done");
  const subtasks = await getSubtasksByTaskIds(allTasks.map((task) => task.id));
  const taskMap = new Map(allTasks.map((task) => [task.id, task]));

  const childrenByParent = new Map<string | null, typeof subtasks>();
  for (const subtask of subtasks) {
    const key = subtask.parent_subtask_id ?? null;
    const list = childrenByParent.get(key) ?? [];
    list.push(subtask);
    childrenByParent.set(key, list);
  }

  const orderedSubtasks: { subtask: (typeof subtasks)[number]; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const subtask of childrenByParent.get(parentId) ?? []) {
      orderedSubtasks.push({ subtask, depth });
      walk(subtask.id, depth + 1);
    }
  };
  walk(null, 0);

  const pickableSubtasks = orderedSubtasks
    .map(({ subtask, depth }) => {
      const task = taskMap.get(subtask.task_id);
      return {
        ...subtask,
        depth,
        taskTitle: task?.title ?? "Task",
        workspace: task?.workspace ?? "office",
        category: task?.category ?? null,
      };
    })
    .filter((item) => taskMap.has(item.task_id));

  const tree = buildSessionItemTree(items);
  const progress = calculateSessionProgress(items);

  return (
    <>
      <PageHeader
        title={session.title}
        description={
          session.status === "done"
            ? "This session is marked complete."
            : "Check off items as you go. Linked subtasks sync to your main tasks."
        }
        actions={
          <Link href="/sessions">
            <Button type="button" variant="secondary" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              All sessions
            </Button>
          </Link>
        }
      />

      <div className="flex min-w-0 flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 animate-fade-in">
        <SessionDetail
          session={session}
          tree={tree}
          progress={progress}
          linkedTasks={linkedTasks}
          pickableSubtasks={pickableSubtasks}
        />
      </div>
    </>
  );
}
