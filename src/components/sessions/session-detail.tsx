"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Link2,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import {
  addLinkedSubtaskAction,
  addSessionItemAction,
  deleteSessionItemAction,
  markSessionDoneAction,
  reopenSessionAction,
  reorderSessionItemsAction,
  toggleSessionItemAction,
} from "@/lib/sessions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { SessionItemNode } from "@/lib/db/sessions";
import type { Session } from "@/lib/types/database";
import type { Subtask, Task } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { motion } from "@/lib/utils/motion";

type PickableSubtask = Subtask & {
  taskTitle: string;
  workspace: string;
  depth: number;
};

const LinkedSessionContext = createContext(false);

const WORKSPACE_TABS: { id: "office" | "personal"; label: string; icon: typeof Briefcase }[] = [
  { id: "office", label: "Office", icon: Briefcase },
  { id: "personal", label: "Personal", icon: Target },
];

type SessionDetailProps = {
  session: Session;
  tree: SessionItemNode[];
  progress: number;
  linkedTask: Task | null;
  pickableSubtasks: PickableSubtask[];
};

export function SessionDetail({
  session,
  tree: initialTree,
  progress,
  linkedTask,
  pickableSubtasks,
}: SessionDetailProps) {
  const [pending, startTransition] = useTransition();

  function handleMarkDone() {
    startTransition(async () => {
      await markSessionDoneAction(session.id);
    });
  }

  function handleReopen() {
    startTransition(async () => {
      await reopenSessionAction(session.id);
    });
  }

  return (
    <LinkedSessionContext.Provider value={linkedTask !== null}>
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {linkedTask && (
            <p className="mb-1 text-xs text-muted">
              Linked to{" "}
              <Link
                href={`/${linkedTask.workspace}/${linkedTask.id}`}
                className="text-accent hover:underline"
              >
                {linkedTask.title}
              </Link>
            </p>
          )}
          <div className="max-w-md">
            <ProgressBar value={progress} showLabel />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {session.status === "active" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={handleMarkDone}
            >
              Mark session done
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={handleReopen}
            >
              Reopen session
            </Button>
          )}
        </div>
      </div>

      <AddSessionItemButtons
        sessionId={session.id}
        pickableSubtasks={pickableSubtasks}
      />

      <SessionItemTree
        sessionId={session.id}
        nodes={initialTree}
        pickableSubtasks={pickableSubtasks}
      />
    </div>
    </LinkedSessionContext.Provider>
  );
}

function SessionItemTree({
  sessionId,
  nodes,
  pickableSubtasks,
}: {
  sessionId: string;
  nodes: SessionItemNode[];
  pickableSubtasks: PickableSubtask[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    collectParentIds(nodes)
  );

  if (nodes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-8 text-center text-sm text-muted">
        No checklist items yet. Type a task above or pick subtasks from your main task.
      </p>
    );
  }

  return (
    <SortableItemList
      nodes={nodes}
      depth={0}
      parentItemId={null}
      sessionId={sessionId}
      expanded={expanded}
      setExpanded={setExpanded}
      pickableSubtasks={pickableSubtasks}
    />
  );
}

function collectParentIds(nodes: SessionItemNode[]): Set<string> {
  const ids = new Set<string>();
  function walk(items: SessionItemNode[]) {
    for (const item of items) {
      if (item.children.length > 0) {
        ids.add(item.id);
        walk(item.children);
      }
    }
  }
  walk(nodes);
  return ids;
}

function SortableItemList({
  nodes: initialNodes,
  depth,
  parentItemId,
  sessionId,
  expanded,
  setExpanded,
  pickableSubtasks,
}: {
  nodes: SessionItemNode[];
  depth: number;
  parentItemId: string | null;
  sessionId: string;
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  pickableSubtasks: PickableSubtask[];
}) {
  const [nodes, setNodes] = useState(initialNodes);
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = nodes.findIndex((node) => node.id === active.id);
    const newIndex = nodes.findIndex((node) => node.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const next = arrayMove(nodes, oldIndex, newIndex);
    setNodes(next);
    startTransition(async () => {
      await reorderSessionItemsAction(
        sessionId,
        next.map((node) => node.id)
      );
    });
  }

  const listItems = nodes.map((node, index) => (
    <SessionItemRow
      key={node.id}
      node={node}
      priority={index + 1}
      depth={depth}
      sessionId={sessionId}
      expanded={expanded}
      setExpanded={setExpanded}
      sortable={mounted}
      pickableSubtasks={pickableSubtasks}
    />
  ));

  return (
    <ul className={cn("space-y-1", pending && "opacity-70")}>
      {mounted ? (
        <DndContext
          id={`${sessionId}-${parentItemId ?? "root"}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={nodes.map((node) => node.id)}
            strategy={verticalListSortingStrategy}
          >
            {listItems}
          </SortableContext>
        </DndContext>
      ) : (
        listItems
      )}
    </ul>
  );
}

function SessionItemRow({
  node,
  priority,
  depth,
  sessionId,
  expanded,
  setExpanded,
  sortable,
  pickableSubtasks,
}: {
  node: SessionItemNode;
  priority: number;
  depth: number;
  sessionId: string;
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  sortable: boolean;
  pickableSubtasks: PickableSubtask[];
}) {
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const isParent = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isDone = node.status === "done";
  const sortableState = useSortable({ id: node.id, disabled: !sortable });

  function toggleExpanded() {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleSessionItemAction(
        sessionId,
        node.id,
        node.status,
        node.linked_subtask_id
      );
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSessionItemAction(sessionId, node.id);
    });
  }

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
    >
      <div
        className={cn(
          "group flex items-center gap-2 rounded-lg border border-transparent py-2 pr-2",
          motion.row,
          pending && "opacity-60",
          sortable &&
            sortableState.isDragging &&
            "relative z-10 border-border bg-card shadow-md"
        )}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {sortable ? (
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-md border border-transparent text-muted hover:border-border hover:bg-card hover:text-primary active:cursor-grabbing active:border-primary/40 active:bg-primary/10 active:text-primary touch-manipulation"
            aria-label={`Reorder ${node.title}`}
            {...sortableState.attributes}
            {...sortableState.listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-muted">
            <GripVertical className="h-4 w-4 opacity-40" />
          </span>
        )}

        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-accent">
          {priority}
        </span>

        {isParent ? (
          <button
            type="button"
            onClick={toggleExpanded}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-card"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center sm:h-7 sm:w-7">
            <input
              type="checkbox"
              checked={isDone}
              onChange={handleToggle}
              className="h-5 w-5 cursor-pointer sm:h-4 sm:w-4 rounded border-border bg-background accent-primary"
              aria-label={`Mark ${node.title} as done`}
            />
          </label>
        )}

        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-sm",
              isDone && "text-muted line-through decoration-muted"
            )}
          >
            {node.title}
          </span>
          {node.linked_subtask_id && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-accent">
              <Link2 className="h-3 w-3" />
              Synced with main task
            </span>
          )}
        </div>

        {!isParent && (
          <button
            type="button"
            onClick={handleToggle}
            className="hidden rounded-md px-2 py-1 text-xs text-muted hover:bg-card sm:inline"
          >
            {isDone ? "Undo" : "Done"}
          </button>
        )}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-md px-2 py-2 text-xs text-accent hover:bg-card sm:py-1"
        >
          + Child
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-danger/10 hover:text-danger sm:h-8 sm:w-8"
          aria-label="Delete item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <AddItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        sessionId={sessionId}
        parentItemId={node.id}
        pickableSubtasks={pickableSubtasks}
        title="Add child item"
      />

      {isParent && isExpanded && (
        <SortableItemList
          nodes={node.children}
          depth={depth + 1}
          parentItemId={node.id}
          sessionId={sessionId}
          expanded={expanded}
          setExpanded={setExpanded}
          pickableSubtasks={pickableSubtasks}
        />
      )}
    </li>
  );
}

function AddSessionItemButtons({
  sessionId,
  pickableSubtasks,
}: {
  sessionId: string;
  pickableSubtasks: PickableSubtask[];
}) {
  const [pickOpen, setPickOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleQuickAdd(event: React.FormEvent) {
    event.preventDefault();
    const title = quickTitle.trim();
    if (!title) {
      return;
    }

    const formData = new FormData();
    formData.set("title", title);
    setQuickTitle("");
    startTransition(async () => {
      await addSessionItemAction(sessionId, formData);
      inputRef.current?.focus();
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <Input
          ref={inputRef}
          value={quickTitle}
          onChange={(event) => setQuickTitle(event.target.value)}
          placeholder="Type a task and press Enter..."
          enterKeyHint="done"
        />
        <Button
          type="submit"
          disabled={pending || !quickTitle.trim()}
          className="shrink-0 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setPickOpen(true)}
        className="w-full gap-1.5 sm:w-auto"
      >
        <Link2 className="h-4 w-4" />
        Pick subtasks from main task
      </Button>

      <AddItemModal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        sessionId={sessionId}
        pickableSubtasks={pickableSubtasks}
        title="Pick from main task"
        initialMode="pick"
      />
    </div>
  );
}

function AddItemModal({
  open,
  onClose,
  sessionId,
  parentItemId = null,
  pickableSubtasks,
  title,
  initialMode = "new",
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  parentItemId?: string | null;
  pickableSubtasks: PickableSubtask[];
  title: string;
  initialMode?: "new" | "pick";
}) {
  const [mode, setMode] = useState<"new" | "pick">(initialMode);
  const [itemTitle, setItemTitle] = useState("");
  const [search, setSearch] = useState("");
  const [pickWorkspace, setPickWorkspace] = useState<"office" | "personal">("office");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const linkedOnly = useContext(LinkedSessionContext);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setItemTitle("");
      setSearch("");
      setSelectedIds(new Set());
    }
  }, [open, initialMode]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const available = pickableSubtasks.filter(
      (item) =>
        item.status !== "done" && (linkedOnly || item.workspace === pickWorkspace)
    );
    const limit = linkedOnly ? Infinity : 30;
    if (!query) {
      return available.slice(0, limit);
    }
    return available
      .filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.taskTitle.toLowerCase().includes(query)
      )
      .slice(0, limit);
  }, [pickableSubtasks, search, pickWorkspace, linkedOnly]);

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleAddNew(event: React.FormEvent) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("title", itemTitle);
    if (parentItemId) {
      formData.set("parent_item_id", parentItemId);
    }

    startTransition(async () => {
      await addSessionItemAction(sessionId, formData);
      setItemTitle("");
      onClose();
    });
  }

  function handlePickSelected() {
    const chosen = pickableSubtasks.filter((item) => selectedIds.has(item.id));
    if (chosen.length === 0) {
      return;
    }

    startTransition(async () => {
      await Promise.all(
        chosen.map((subtask) =>
          addLinkedSubtaskAction(sessionId, subtask.id, subtask.title, parentItemId)
        )
      );
      setSelectedIds(new Set());
      onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={
        mode === "pick"
          ? "Tick one or more subtasks — they stay synced with your main task."
          : "Quick checklist item for this session."
      }
      size="md"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              mode === "new"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted hover:text-foreground"
            )}
          >
            New item
          </button>
          <button
            type="button"
            onClick={() => setMode("pick")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              mode === "pick"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted hover:text-foreground"
            )}
          >
            Pick from main task
          </button>
        </div>

        {mode === "new" ? (
          <form onSubmit={handleAddNew} className="space-y-4">
            <Input
              value={itemTitle}
              onChange={(event) => setItemTitle(event.target.value)}
              placeholder="Quick checklist item..."
              required
              autoFocus
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Adding..." : "Add item"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {!linkedOnly && (
            <div className="flex gap-2">
              {WORKSPACE_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPickWorkspace(id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium motion-safe:transition-all",
                    pickWorkspace === id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            )}
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={linkedOnly ? "Search subtasks..." : `Search ${pickWorkspace} subtasks...`}
              autoFocus
            />
            {filtered.length === 0 ? (
              <p className="text-sm text-muted">No open subtasks found.</p>
            ) : (
              <ul className="max-h-[45vh] space-y-2 overflow-y-auto sm:max-h-64">
                {filtered.map((subtask) => {
                  const checked = selectedIds.has(subtask.id);
                  return (
                    <li key={subtask.id}>
                      <label
                        style={linkedOnly ? { marginLeft: `${subtask.depth * 16}px` } : undefined}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 sm:py-2.5",
                          checked
                            ? "border-primary bg-primary/5"
                            : "border-border/70 bg-background/50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(subtask.id)}
                          className="h-4 w-4 shrink-0 cursor-pointer rounded border-border bg-background accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">{subtask.title}</p>
                          <p className="truncate text-[11px] text-muted">
                            {linkedOnly ? subtask.taskTitle : `${subtask.workspace} · ${subtask.taskTitle}`}
                          </p>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-xs text-muted">
                {selectedIds.size} selected
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={pending || selectedIds.size === 0}
                  onClick={handlePickSelected}
                >
                  {pending ? "Adding..." : `Add ${selectedIds.size} selected`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
