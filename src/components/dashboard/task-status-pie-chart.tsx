import { TASK_STATUSES } from "@/lib/constants/task-status";
import type { TaskListItem } from "@/lib/db/queries";
import type { TaskStatus } from "@/lib/types/app";

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "var(--warning)",
  in_progress: "var(--primary)",
  in_testing: "var(--accent)",
  done: "var(--success)",
  paused: "var(--muted)",
};

type TaskStatusPieChartProps = {
  tasks: TaskListItem[];
  title: string;
  size?: number;
};

export function TaskStatusPieChart({
  tasks,
  title,
  size = 132,
}: TaskStatusPieChartProps) {
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = tasks.length;

  const segments = TASK_STATUSES.map((status) => ({
    status: status.value,
    label: status.label,
    value: tasks.filter((task) => task.status === status.value).length,
  })).filter((segment) => segment.value > 0);

  let offsetSoFar = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative inline-flex shrink-0 items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-background"
          />
          {total > 0 &&
            segments.map((segment) => {
              const fraction = segment.value / total;
              const dash = fraction * circumference;
              const circle = (
                <circle
                  key={segment.status}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={STATUS_COLORS[segment.status]}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offsetSoFar}
                  className="motion-safe:transition-all motion-safe:duration-500"
                />
              );
              offsetSoFar += dash;
              return circle;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-foreground">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted">Tasks</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-2 text-sm font-semibold text-foreground">{title}</p>
        {total === 0 ? (
          <p className="text-xs text-muted">No tasks yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {segments.map((segment) => (
              <li
                key={segment.status}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2 text-muted">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[segment.status] }}
                  />
                  <span className="truncate">{segment.label}</span>
                </span>
                <span className="shrink-0 font-medium text-foreground">
                  {segment.value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
