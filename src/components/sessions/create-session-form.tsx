"use client";

import { useActionState, useMemo, useState } from "react";
import { Briefcase, Target, X } from "lucide-react";
import { createSessionAction, type SessionActionState } from "@/lib/sessions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { Session } from "@/lib/types/database";
import type { Task } from "@/lib/types/database";
import type { Workspace } from "@/lib/types/app";
import { cn } from "@/lib/utils/cn";

const initialState: SessionActionState = {};

const TASK_TABS: { id: Workspace; label: string; icon: typeof Briefcase }[] = [
  { id: "office", label: "Office", icon: Briefcase },
  { id: "personal", label: "Personal", icon: Target },
];

type CreateSessionFormProps = {
  tasks: Task[];
  existingSessions: Session[];
};

export function CreateSessionForm({ tasks, existingSessions }: CreateSessionFormProps) {
  const [open, setOpen] = useState(false);
  const [taskTab, setTaskTab] = useState<Workspace>("office");
  const [defaultTitle, setDefaultTitle] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [taskSearch, setTaskSearch] = useState("");
  const [state, formAction, pending] = useActionState(createSessionAction, initialState);

  const unfinishedSessions = existingSessions.filter((session) => session.status === "active");

  const groupedTasksForTab = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    const scoped = tasks.filter(
      (task) =>
        task.workspace === taskTab &&
        (!query ||
          task.title.toLowerCase().includes(query) ||
          (task.category ?? "").toLowerCase().includes(query))
    );

    const groups = new Map<string, Task[]>();
    for (const task of scoped) {
      const key = task.category?.trim() || "Uncategorized";
      const list = groups.get(key) ?? [];
      list.push(task);
      groups.set(key, list);
    }

    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [tasks, taskTab, taskSearch]);

  const selectedTasks = tasks.filter((task) => selectedTaskIds.has(task.id));

  function toggleTask(id: string) {
    setSelectedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function switchTab(tab: Workspace) {
    setTaskTab(tab);
    setTaskSearch("");
  }

  function resetForm() {
    setSelectedTaskIds(new Set());
    setTaskSearch("");
    setTaskTab("office");
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          const time = new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
          setDefaultTitle(`Session · ${time}`);
          resetForm();
          setOpen(true);
        }}
        className="w-full sm:w-auto"
      >
        + New session
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New session"
        description="Just tap Start — the title is pre-filled. Link one or more tasks or carry over unfinished items only if you need to."
        size="md"
      >
        <form action={formAction} className="space-y-4">
          <Input
            label="Session title"
            name="title"
            placeholder="e.g. Hour 1 · Morning focus"
            defaultValue={defaultTitle}
            key={defaultTitle}
            required
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
          />

          <div>
            <label className="mb-2 block text-sm text-muted">
              Link to main task(s) (optional)
            </label>

            {selectedTasks.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selectedTasks.map((task) => (
                  <span
                    key={task.id}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {task.title}
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className="text-muted hover:text-danger"
                      aria-label={`Remove ${task.title}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="mb-2 flex gap-2">
              {TASK_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchTab(id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium motion-safe:transition-all",
                    taskTab === id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <Input
              value={taskSearch}
              onChange={(event) => setTaskSearch(event.target.value)}
              placeholder={`Search ${taskTab} tasks...`}
              className="mb-2"
            />

            <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-border p-2">
              {groupedTasksForTab.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted">No matching tasks.</p>
              ) : (
                groupedTasksForTab.map(([category, categoryTasks]) => (
                  <div key={category}>
                    <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {category}
                    </p>
                    <div className="space-y-1">
                      {categoryTasks.map((task) => {
                        const checked = selectedTaskIds.has(task.id);
                        return (
                          <label
                            key={task.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm",
                              checked
                                ? "border-primary bg-primary/5"
                                : "border-transparent hover:bg-card-hover"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTask(task.id)}
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border-border bg-background accent-primary"
                            />
                            <span className="min-w-0 flex-1 truncate text-foreground">
                              {task.title}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedTasks.map((task) => (
              <input
                key={task.id}
                type="hidden"
                name="linked_task_ids"
                value={task.id}
              />
            ))}
          </div>

          {unfinishedSessions.length > 0 && (
            <div>
              <label htmlFor="carry-from" className="mb-2 block text-sm text-muted">
                Move unfinished items from
              </label>
              <select
                id="carry-from"
                name="carry_from_session_id"
                defaultValue=""
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Start empty</option>
                {unfinishedSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted">
                Only incomplete checklist items move into the new session.
              </p>
            </div>
          )}

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Starting..." : "Start session"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
