import Link from "next/link";
import { Briefcase, Target, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MonthlyEntriesPanel } from "@/components/monthly/monthly-entries-panel";
import { TaskStatusPieChart } from "@/components/monthly/task-status-pie-chart";
import { DownloadAllTasksButton } from "@/components/monthly/download-all-tasks-button";
import { getMonthlyDashboardData, type TaskListItem } from "@/lib/db/queries";
import { getMonthlyEntries } from "@/lib/db/monthly";

type MonthlyPageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function MonthlyPage({ searchParams }: MonthlyPageProps) {
  const params = await searchParams;
  const data = await getMonthlyDashboardData(params.month);

  const [wins, focus] = await Promise.all([
    getMonthlyEntries(data.monthStart, "win"),
    getMonthlyEntries(data.monthStart, "focus"),
  ]);

  const focusTasks = data.allTasks.filter((task) => task.status !== "done");

  return (
    <>
      <PageHeader
        title="Monthly Progress Overview"
        description={data.monthLabel}
        actions={
          <form method="GET" className="flex items-center gap-2">
            <input
              type="month"
              name="month"
              defaultValue={data.monthStart.slice(0, 7)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Go
            </button>
          </form>
        }
      />

      <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Overall Progress">
            <div className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:scale-105">
              <CircularProgress value={data.overallProgress} size={76} />
            </div>
          </StatCard>
          <StatCard title="Tasks Completed" value={String(data.completed)} />
          <StatCard title="Tasks Pending" value={String(data.pending)} />
          <StatCard title="Overdue" value={String(data.overdue)} accent={data.overdue > 0} />
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Status Breakdown</CardTitle>
            <DownloadAllTasksButton
              officeTasks={data.officeTasks}
              personalTasks={data.personalTasks}
            />
          </CardHeader>
          <CardContent className="grid min-w-0 gap-4 lg:grid-cols-2">
            <TaskStatusPieChart
              tasks={data.officeTasks}
              title="Office"
              icon={Briefcase}
            />
            <TaskStatusPieChart
              tasks={data.personalTasks}
              title="Personal"
              icon={Target}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Progress by Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <WorkspaceBar
                label="Personal"
                progress={data.personalProgress}
                completed={data.personalCompleted}
                pending={data.personalPending}
              />
              <WorkspaceBar
                label="Office"
                progress={data.officeProgress}
                completed={data.officeCompleted}
                pending={data.officePending}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Goal Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <GoalProgressGroup
                label="Office"
                icon={Briefcase}
                tasks={data.officeTasks}
              />
              <GoalProgressGroup
                label="Personal"
                icon={Target}
                tasks={data.personalTasks}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <MonthlyEntriesPanel
                monthStart={data.monthStart}
                type="win"
                title="This Month Wins"
                entries={wins}
                tasks={data.allTasks}
                placeholder="Finished TensorFlow course..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <MonthlyEntriesPanel
                monthStart={data.monthStart}
                type="focus"
                title={`Next Month Focus (${data.nextMonthLabel})`}
                entries={focus}
                tasks={focusTasks}
                placeholder="RAG Project..."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function StatCard({
  title,
  value,
  accent,
  children,
}: {
  title: string;
  value?: string;
  accent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card className="motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-border-muted motion-safe:hover:shadow-lg">
      <CardContent className="flex flex-col items-center justify-center py-6 text-center">
        <p className="text-sm text-muted">{title}</p>
        {children}
        {value !== undefined && (
          <p
            className={`mt-2 text-3xl font-bold ${
              accent ? "text-danger" : "text-foreground"
            }`}
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function GoalProgressGroup({
  label,
  icon: Icon,
  tasks,
}: {
  label: string;
  icon: LucideIcon;
  tasks: TaskListItem[];
}) {
  const activeTasks = tasks.filter((task) => task.status !== "done");
  const visible = (activeTasks.length > 0 ? activeTasks : tasks).slice(0, 4);

  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <Icon className="h-3.5 w-3.5 text-accent" />
        {label}
      </p>
      {visible.length === 0 ? (
        <p className="text-sm text-muted">No goals or tasks yet.</p>
      ) : (
        <div className="space-y-4">
          {visible.map((task) => (
            <div key={task.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <Link
                  href={`/${task.workspace}/${task.id}`}
                  className="truncate font-medium text-foreground hover:text-accent"
                >
                  {task.title}
                </Link>
                <span className="shrink-0 text-muted">{task.progress}%</span>
              </div>
              <ProgressBar value={task.progress} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceBar({
  label,
  progress,
  completed,
  pending,
}: {
  label: string;
  progress: number;
  completed: number;
  pending: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted">{progress}%</span>
      </div>
      <ProgressBar value={progress} />
      <p className="text-xs text-muted">
        Completed: {completed} · Pending: {pending}
      </p>
    </div>
  );
}
