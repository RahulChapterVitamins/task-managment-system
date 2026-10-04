"use client";

import { useMemo, useState, useTransition } from "react";
import { Briefcase, History, Plus, Search, Target } from "lucide-react";
import { SortableTaskTable } from "@/components/tasks/sortable-task-table";
import { CopyTasksExcelButton } from "@/components/tasks/copy-tasks-excel-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircularProgress } from "@/components/ui/circular-progress";
import {
  addTaskToTodayAction,
  carryOverYesterdayAction,
  removeTaskFromTodayAction,
  reorderTodayTasksAction,
} from "@/lib/daily/actions";
import type { TaskListItem } from "@/lib/db/queries";
import type { Workspace } from "@/lib/types/app";
import { cn } from "@/lib/utils/cn";

type TodayBoardProps = {
  date: string;
  todayTasks: TaskListItem[];
  availableTasks: TaskListItem[];
};

const TABS: { id: Workspace; label: string; icon: typeof Briefcase }[] = [
  { id: "office", label: "Office", icon: Briefcase },
  { id: "personal", label: "Personal", icon: Target },
];

export function TodayBoard({ date, todayTasks, availableTasks }: TodayBoardProps) {
  const [activeTab, setActiveTab] = useState<Workspace>("office");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [carryOverPending, startCarryOverTransition] = useTransition();
  const [carryOverMessage, setCarryOverMessage] = useState<string | null>(null);

  const officeToday = useMemo(
    () => todayTasks.filter((task) => task.workspace === "office"),
    [todayTasks]
  );
  const personalToday = useMemo(
    () => todayTasks.filter((task) => task.workspace === "personal"),
    [todayTasks]
  );

  const activeTodayTasks = activeTab === "office" ? officeToday : personalToday;

  const doneCount = todayTasks.filter((task) => task.status === "done").length;
  const totalCount = todayTasks.length;
  const todayProgress =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const filteredAvailable = useMemo(() => {
    const query = search.trim().toLowerCase();
    const scoped = availableTasks.filter((task) => task.workspace === activeTab);

    if (!query) {
      return scoped;
    }

    return scoped.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.category?.toLowerCase().includes(query)
    );
  }, [availableTasks, search, activeTab]);

  function handleReorder(taskIds: string[]) {
    return reorderTodayTasksAction(date, taskIds);
  }

  function handleRemove(taskId: string) {
    return removeTaskFromTodayAction(date, taskId);
  }

  function handleAdd(taskId: string) {
    startTransition(async () => {
      await addTaskToTodayAction(date, taskId);
    });
  }

  function handleCarryOverYesterday() {
    setCarryOverMessage(null);
    startCarryOverTransition(async () => {
      const result = await carryOverYesterdayAction(date);
      setCarryOverMessage(
        result.added > 0
          ? `Added ${result.added} unfinished task${result.added === 1 ? "" : "s"} from yesterday.`
          : "No unfinished tasks from yesterday."
      );
    });
  }

  const returnTo = `/today?date=${date}`;

  return (
    <div className="space-y-5">
      {totalCount > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-4 sm:px-5">
          <CircularProgress value={todayProgress} size={64} strokeWidth={6} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {doneCount} of {totalCount} today&apos;s tasks done
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {doneCount === totalCount
                ? "All done for today — great work!"
                : `${totalCount - doneCount} left to go. Keep going!`}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Pick tasks for today and set priority within Office or Personal — separate from your main lists.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "office" && (
            <CopyTasksExcelButton
              tasks={activeTodayTasks}
              reportDate={date}
              label="Copy for Excel"
            />
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={carryOverPending}
            onClick={handleCarryOverYesterday}
          >
            <History className="h-4 w-4" />
            {carryOverPending ? "Bringing forward..." : "Bring yesterday's unfinished"}
          </Button>
          <Button type="button" size="sm" onClick={() => setPickerOpen((open) => !open)}>
            <Plus className="h-4 w-4" />
            Add {activeTab === "office" ? "office" : "personal"} task
          </Button>
        </div>
      </div>

      {carryOverMessage && (
        <p className="text-xs text-muted">{carryOverMessage}</p>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const count = id === "office" ? officeToday.length : personalToday.length;
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                setSearch("");
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium motion-safe:transition-all",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted hover:border-primary/40 hover:bg-card-hover hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  isActive ? "bg-black/15 text-primary-foreground" : "bg-background text-muted"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {pickerOpen && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${activeTab} backlog...`}
            />
          </div>

          {filteredAvailable.length === 0 ? (
            <p className="text-sm text-muted">
              {availableTasks.filter((task) => task.workspace === activeTab).length === 0
                ? `All active ${activeTab} tasks are already in today's list.`
                : "No tasks match your search."}
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {filteredAvailable.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {task.title}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {task.category ?? "Uncategorized"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => handleAdd(task.id)}
                  >
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTodayTasks.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <p className="font-medium text-foreground">
            No {activeTab} tasks for this day
          </p>
          <p className="mt-2 text-sm text-muted">
            Tap &quot;Add {activeTab === "office" ? "office" : "personal"} task&quot; to build your daily focus list.
          </p>
        </div>
      ) : (
        <SortableTaskTable
          tasks={activeTodayTasks}
          dndId={`today-${date}-${activeTab}`}
          showCategory
          returnTo={returnTo}
          onReorder={handleReorder}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
}
