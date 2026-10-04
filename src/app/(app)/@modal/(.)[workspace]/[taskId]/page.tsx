import { notFound } from "next/navigation";
import { getTaskDetail } from "@/lib/db/queries";
import { TaskDetailView } from "@/components/tasks/task-detail-view";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { isWorkspace } from "@/lib/utils/workspace";

export default async function TaskDetailInterceptedPage({
  params,
}: {
  params: Promise<{ workspace: string; taskId: string }>;
}) {
  const { workspace, taskId } = await params;

  if (!isWorkspace(workspace)) {
    notFound();
  }

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
