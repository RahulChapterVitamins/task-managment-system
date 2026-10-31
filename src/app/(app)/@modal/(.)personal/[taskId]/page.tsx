import { TaskDetailInterceptedContent } from "@/components/tasks/task-detail-intercepted-content";

export default async function InterceptedPersonalTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return <TaskDetailInterceptedContent workspace="personal" taskId={taskId} />;
}
