import Link from "next/link";
import { RememberLastTask } from "@/components/tasks/remember-last-task";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { TaskEditForm } from "@/components/tasks/task-edit-form";
import { TaskActionsMenu } from "@/components/tasks/task-actions-menu";
import { SubtaskTree, AddSubtaskForm } from "@/components/tasks/subtask-tree";
import { ReviewsPanel } from "@/components/tasks/reviews-panel";
import { formatTimelineRange } from "@/lib/progress";
import type { TaskDetail } from "@/lib/db/queries";
import type { Workspace } from "@/lib/types/app";
import { workspaceLabel } from "@/lib/utils/workspace";
import { cn } from "@/lib/utils/cn";

type TaskDetailViewProps = {
  workspace: Workspace;
  detail: TaskDetail;
  compact?: boolean;
};

export function TaskDetailView({
  workspace,
  detail,
  compact = false,
}: TaskDetailViewProps) {
  const { task, subtaskTree, reviews } = detail;

  return (
    <>
      <RememberLastTask
        workspace={workspace}
        taskId={task.id}
        title={task.title}
      />
      <div className="border-b border-border px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        {!compact && (
          <Link
            href={`/${workspace}`}
            className="text-sm text-accent hover:text-foreground"
          >
            ← Back to {workspaceLabel(workspace)}
          </Link>
        )}

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                {task.title}
              </h1>
              <Badge variant={task.status} />
            </div>
            {task.category && (
              <p className="mt-2 text-sm uppercase tracking-wide text-accent">
                {task.category}
              </p>
            )}
            <p className="mt-2 text-sm text-muted">
              {formatTimelineRange(task.timeline_start, task.timeline_end)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TaskEditForm workspace={workspace} task={task} />
            <TaskActionsMenu
              workspace={workspace}
              taskId={task.id}
              taskTitle={task.title}
            />
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:px-8 lg:py-6",
          !compact && "lg:grid-cols-4"
        )}
      >
        <InfoCard title="Purpose" value={task.purpose} />
        <InfoCard title="Expected result" value={task.expected_result} />
        <InfoCard
          title="Timeline"
          value={formatTimelineRange(task.timeline_start, task.timeline_end)}
        />
        <Card className="flex items-center justify-center">
          <CardContent className="flex flex-col items-center py-6">
            <CircularProgress value={task.progress} />
            <p className="mt-2 text-sm text-muted">Overall progress</p>
          </CardContent>
        </Card>
      </div>

      <div
        className={cn(
          "grid flex-1 gap-6 px-4 pb-8 sm:px-6 lg:px-8 animate-fade-in",
          !compact && "lg:grid-cols-2"
        )}
      >
        <Card>
          <CardHeader>
            <CardTitle>Subtasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SubtaskTree
              workspace={workspace}
              taskId={task.id}
              nodes={subtaskTree}
            />
            <AddSubtaskForm workspace={workspace} taskId={task.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback / Review</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewsPanel
              workspace={workspace}
              taskId={task.id}
              reviews={reviews}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function InfoCard({ title, value }: { title: string; value: string | null }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-foreground whitespace-pre-line">
          {value?.trim() || "—"}
        </p>
      </CardContent>
    </Card>
  );
}
