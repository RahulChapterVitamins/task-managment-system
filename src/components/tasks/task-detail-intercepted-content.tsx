import { notFound } from "next/navigation";
import { getTaskDetail } from "@/lib/db/queries";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { TaskDetailView } from "@/components/tasks/task-detail-view";
import type { Workspace } from "@/lib/types/app";

export async function TaskDetailInterceptedContent({
  workspace,
  taskId,
}: {
  workspace: Workspace;
  taskId: string;
}) {
  const detail = await getTaskDetail(taskId);

  if (!detail || detail.task.workspace !== workspace) {
    notFound();
  }

  return (
    <TaskDetailModal>
      <TaskDetailView workspace={workspace} detail={detail} compact />
    </TaskDetailModal>
  );
}
