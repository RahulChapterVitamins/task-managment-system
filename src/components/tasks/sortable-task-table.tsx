"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskActionsMenu } from "@/components/tasks/task-actions-menu";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { reorderTasksAction } from "@/lib/tasks/actions";
import { formatTimelineDate } from "@/lib/progress";
import type { TaskListItem } from "@/lib/db/queries";
import type { Workspace } from "@/lib/types/app";
import { cn } from "@/lib/utils/cn";

type SortableTaskTableProps = {
  tasks: TaskListItem[];
  dndId: string;
  workspace?: Workspace;
  showCategory?: boolean;
  showWorkspace?: boolean;
  showPriority?: boolean;
  sectionTitle?: string;
  returnTo?: string;
  onReorder?: (taskIds: string[]) => Promise<void>;
  onRemove?: (taskId: string) => Promise<void>;
};

export function SortableTaskTable({
  tasks: initialTasks,
  dndId,
  workspace,
  showCategory = false,
  showWorkspace = false,
  showPriority = true,
  sectionTitle,
  returnTo,
  onReorder,
  onRemove,
}: SortableTaskTableProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tasks.findIndex((task) => task.id === active.id);
    const newIndex = tasks.findIndex((task) => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const next = arrayMove(tasks, oldIndex, newIndex);
    setTasks(next);

    startTransition(async () => {
      const taskIds = next.map((task) => task.id);

      if (onReorder) {
        await onReorder(taskIds);
      } else if (workspace) {
        await reorderTasksAction(workspace, taskIds);
      }
    });
  }

  const sharedProps = {
    tasks,
    showCategory,
    showWorkspace,
    showPriority,
    returnTo,
    onRemove,
    sortable: mounted,
  };

  const activeTask = activeId ? tasks.find((task) => task.id === activeId) : undefined;
  const activePriority = activeTask ? tasks.indexOf(activeTask) + 1 : 0;

  return (
    <div className={cn("space-y-3", pending && "opacity-70")}>
      {sectionTitle && (
        <h2 className="text-sm font-semibold text-foreground">{sectionTitle}</h2>
      )}

      {mounted ? (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <TaskListDesktop {...sharedProps} />
            <TaskListMobile {...sharedProps} />
          </SortableContext>
          <DragOverlay>
            {activeTask && (
              <DragPreviewCard task={activeTask} priority={activePriority} />
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <>
          <TaskListDesktop {...sharedProps} sortable={false} />
          <TaskListMobile {...sharedProps} sortable={false} />
        </>
      )}
    </div>
  );
}

type TaskListProps = {
  tasks: TaskListItem[];
  showCategory: boolean;
  showWorkspace: boolean;
  showPriority: boolean;
  returnTo?: string;
  onRemove?: (taskId: string) => Promise<void>;
  sortable: boolean;
};

function TaskListDesktop({
  tasks,
  showCategory,
  showWorkspace,
  showPriority,
  returnTo,
  onRemove,
  sortable,
}: TaskListProps) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="w-10 px-3 py-3" aria-label="Reorder" />
            {showPriority && <th className="w-12 px-3 py-3 font-medium">#</th>}
            <th className="px-3 py-3 font-medium">Title</th>
            {showWorkspace && <th className="px-3 py-3 font-medium">Workspace</th>}
            {showCategory && <th className="px-3 py-3 font-medium">Category</th>}
            <th className="px-3 py-3 font-medium">Due</th>
            <th className="px-3 py-3 font-medium">Progress</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) =>
            sortable ? (
              <SortableDesktopRow
                key={task.id}
                task={task}
                priority={index + 1}
                showCategory={showCategory}
                showWorkspace={showWorkspace}
                showPriority={showPriority}
                returnTo={returnTo}
                onRemove={onRemove}
              />
            ) : (
              <StaticDesktopRow
                key={task.id}
                task={task}
                priority={index + 1}
                showCategory={showCategory}
                showWorkspace={showWorkspace}
                showPriority={showPriority}
                returnTo={returnTo}
                onRemove={onRemove}
              />
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function TaskListMobile({
  tasks,
  showCategory,
  showWorkspace,
  showPriority,
  returnTo,
  onRemove,
  sortable,
}: TaskListProps) {
  return (
    <ul className="space-y-2.5 lg:hidden">
      {tasks.map((task, index) =>
        sortable ? (
          <SortableMobileCard
            key={task.id}
            task={task}
            priority={index + 1}
            showCategory={showCategory}
            showWorkspace={showWorkspace}
            showPriority={showPriority}
            returnTo={returnTo}
            onRemove={onRemove}
          />
        ) : (
          <StaticMobileCard
            key={task.id}
            task={task}
            priority={index + 1}
            showCategory={showCategory}
            showWorkspace={showWorkspace}
            showPriority={showPriority}
            returnTo={returnTo}
            onRemove={onRemove}
          />
        )
      )}
    </ul>
  );
}

type TaskRowProps = {
  task: TaskListItem;
  priority: number;
  showCategory: boolean;
  showWorkspace: boolean;
  showPriority: boolean;
  returnTo?: string;
  onRemove?: (taskId: string) => Promise<void>;
  dragHandle?: React.ReactNode;
};

function TaskMeta({
  task,
  showCategory,
  showWorkspace,
}: Pick<TaskRowProps, "task" | "showCategory" | "showWorkspace">) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      {showWorkspace && (
        <span className="rounded-full bg-background px-2 py-0.5 capitalize">
          {task.workspace}
        </span>
      )}
      {showCategory && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-accent">
          {task.category ?? "Uncategorized"}
        </span>
      )}
      <span>Due {formatTimelineDate(task.timeline_end)}</span>
    </div>
  );
}

function TaskActions({
  task,
  returnTo,
  onRemove,
  compact = false,
}: Pick<TaskRowProps, "task" | "returnTo" | "onRemove"> & { compact?: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    if (!onRemove) {
      return;
    }

    startTransition(async () => {
      await onRemove(task.id);
    });
  }

  return (
    <div className={cn("flex items-center gap-2", compact ? "shrink-0" : "justify-end")}>
      <Link href={`/${task.workspace}/${task.id}`}>
        <Button
          size="sm"
          variant="secondary"
          className={cn(compact && "h-8 w-8 p-0")}
          aria-label={`View ${task.title}`}
        >
          {compact ? <ExternalLink className="h-4 w-4" /> : "View"}
        </Button>
      </Link>
      {onRemove && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={handleRemove}
          aria-label={`Remove ${task.title} from today`}
          className="h-8 w-8 p-0 text-muted hover:text-danger"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <TaskActionsMenu
        workspace={task.workspace}
        taskId={task.id}
        taskTitle={task.title}
        returnTo={returnTo}
      />
    </div>
  );
}

function TaskActionsMobile({
  task,
  returnTo,
  onRemove,
}: Pick<TaskRowProps, "task" | "returnTo" | "onRemove">) {
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    if (!onRemove) {
      return;
    }

    startTransition(async () => {
      await onRemove(task.id);
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {onRemove && (
        <button
          type="button"
          disabled={pending}
          onClick={handleRemove}
          aria-label={`Remove ${task.title} from today`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger touch-manipulation"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <TaskActionsMenu
        workspace={task.workspace}
        taskId={task.id}
        taskTitle={task.title}
        returnTo={returnTo}
      />
    </div>
  );
}

function StaticDesktopRow(props: TaskRowProps) {
  const { task, priority, showCategory, showWorkspace, showPriority, returnTo, onRemove } =
    props;

  return (
    <tr className="border-b border-border/70 last:border-b-0 hover:bg-card-hover">
      <td className="px-2 py-3">
        <GripVertical className="mx-auto h-4 w-4 text-muted opacity-40" />
      </td>
      {showPriority && (
        <td className="px-3 py-3">
          <PriorityBadge value={priority} />
        </td>
      )}
      <td className="px-3 py-3">
        <Link
          href={`/${task.workspace}/${task.id}`}
          className="font-medium text-foreground hover:text-accent"
        >
          {task.title}
        </Link>
      </td>
      {showWorkspace && <td className="px-3 py-3 capitalize text-muted">{task.workspace}</td>}
      {showCategory && (
        <td className="px-3 py-3 text-muted">
          {task.category ?? "Uncategorized"}
        </td>
      )}
      <td className="px-3 py-3 text-muted">{formatTimelineDate(task.timeline_end)}</td>
      <td className="px-3 py-3">
        <div className="w-28">
          <ProgressBar value={task.progress} showLabel />
        </div>
      </td>
      <td className="px-3 py-3">
        <TaskStatusSelect
          workspace={task.workspace}
          taskId={task.id}
          status={task.status}
          compact
        />
      </td>
      <td className="px-3 py-3">
        <TaskActions task={task} returnTo={returnTo} onRemove={onRemove} />
      </td>
    </tr>
  );
}

function SortableDesktopRow(props: TaskRowProps) {
  const { task, priority, showCategory, showWorkspace, showPriority, returnTo, onRemove } =
    props;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "border-b border-border/70 last:border-b-0 hover:bg-card-hover",
        isDragging && "relative z-10 bg-card-hover shadow-md"
      )}
    >
      <td className="p-0">
        <button
          type="button"
          className="flex h-full min-h-12 w-12 cursor-grab touch-none items-center justify-center border border-transparent text-muted hover:border-border hover:bg-background hover:text-primary active:cursor-grabbing active:border-primary/40 active:bg-primary/10 active:text-primary"
          aria-label={`Reorder ${task.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      </td>
      {showPriority && (
        <td className="px-3 py-3">
          <PriorityBadge value={priority} />
        </td>
      )}
      <td className="px-3 py-3">
        <Link
          href={`/${task.workspace}/${task.id}`}
          className="font-medium text-foreground hover:text-accent"
        >
          {task.title}
        </Link>
      </td>
      {showWorkspace && <td className="px-3 py-3 capitalize text-muted">{task.workspace}</td>}
      {showCategory && (
        <td className="px-3 py-3 text-muted">
          {task.category ?? "Uncategorized"}
        </td>
      )}
      <td className="px-3 py-3 text-muted">{formatTimelineDate(task.timeline_end)}</td>
      <td className="px-3 py-3">
        <div className="w-28">
          <ProgressBar value={task.progress} showLabel />
        </div>
      </td>
      <td className="px-3 py-3">
        <TaskStatusSelect
          workspace={task.workspace}
          taskId={task.id}
          status={task.status}
          compact
        />
      </td>
      <td className="px-3 py-3">
        <TaskActions task={task} returnTo={returnTo} onRemove={onRemove} />
      </td>
    </tr>
  );
}

function StaticMobileCard(props: TaskRowProps) {
  return <MobileCard {...props} sortable={false} />;
}

function SortableMobileCard(props: TaskRowProps) {
  return <MobileCard {...props} sortable />;
}

function MobileCard({
  task,
  priority,
  showCategory,
  showWorkspace,
  showPriority,
  returnTo,
  onRemove,
  sortable,
}: TaskRowProps & { sortable: boolean }) {
  const sortableState = useSortable({ id: task.id, disabled: !sortable });

  const dragHandle = sortable ? (
    <button
      type="button"
      className="flex h-full w-12 shrink-0 cursor-grab touch-none items-center justify-center border-r border-border/60 text-muted hover:bg-background hover:text-primary active:cursor-grabbing active:bg-primary/10 active:text-primary"
      aria-label={`Reorder ${task.title}`}
      {...sortableState.attributes}
      {...sortableState.listeners}
    >
      <GripVertical className="h-5 w-5" />
    </button>
  ) : (
    <span className="flex w-12 shrink-0 items-center justify-center border-r border-border/60 text-muted">
      <GripVertical className="h-5 w-5 opacity-30" />
    </span>
  );

  return (
    <li
      ref={sortable ? sortableState.setNodeRef : undefined}
      style={
        sortable
          ? {
              transform: CSS.Transform.toString(sortableState.transform),
              transition: sortableState.transition,
            }
          : undefined
      }
      className={cn(
        "flex overflow-hidden rounded-xl border border-border/80 bg-card",
        sortable && sortableState.isDragging && "relative z-10 shadow-lg ring-1 ring-primary/30"
      )}
    >
      {dragHandle}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2 p-3">
          {showPriority && <PriorityBadge value={priority} className="mt-0.5" />}
          <div className="min-w-0 flex-1 pt-0.5">
            <Link
              href={`/${task.workspace}/${task.id}`}
              className="line-clamp-2 text-sm font-semibold leading-snug text-foreground hover:text-accent"
            >
              {task.title}
            </Link>
          </div>
          <TaskActionsMobile task={task} returnTo={returnTo} onRemove={onRemove} />
        </div>

        <div className="space-y-2.5 border-t border-border/50 px-3 py-2.5">
          <TaskMeta
            task={task}
            showCategory={showCategory}
            showWorkspace={showWorkspace}
          />

          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <ProgressBar value={task.progress} size="sm" showLabel />
            </div>
            <TaskStatusSelect
              workspace={task.workspace}
              taskId={task.id}
              status={task.status}
              compact
              className="w-[8.5rem] shrink-0"
            />
          </div>
        </div>
      </div>
    </li>
  );
}

function DragPreviewCard({ task, priority }: { task: TaskListItem; priority: number }) {
  return (
    <div className="flex w-[min(90vw,26rem)] cursor-grabbing items-center gap-3 rounded-xl border border-primary bg-card px-3 py-2.5 shadow-xl shadow-primary/20 ring-2 ring-primary/40">
      <GripVertical className="h-4 w-4 shrink-0 text-primary" />
      <PriorityBadge value={priority} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
        {task.title}
      </span>
    </div>
  );
}

function PriorityBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-accent",
        className
      )}
    >
      {value}
    </span>
  );
}
