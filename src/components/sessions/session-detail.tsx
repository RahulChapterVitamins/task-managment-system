"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Link2,
  Plus,
  Target,
  Trash2,
  X,
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
import { ConfettiBurst } from "@/components/ui/confetti-burst";
import { EmojiPop } from "@/components/ui/emoji-pop";
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
  category: string | null;
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
  linkedTasks: Task[];
  pickableSubtasks: PickableSubtask[];
};

export function SessionDetail({
  session,
  tree: initialTree,
  progress,
  linkedTasks,
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
    <LinkedSessionContext.Provider value={linkedTasks.length > 0}>
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {linkedTasks.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">Linked to</span>
              {linkedTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/${task.workspace}/${task.id}`}
                  className="truncate rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent hover:bg-accent/15"
                >
                  {task.title}
                </Link>
              ))}
            </div>
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
  const [panelPath, setPanelPath] = useState<string[]>([]);

  function openChildren(id: string) {
    setPanelPath((path) => [...path, id]);
  }

  function goBack() {
    setPanelPath((path) => path.slice(0, -1));
  }

  function closePanel() {
    setPanelPath([]);
  }

  const chain: SessionItemNode[] = [];
  let pool = nodes;
  for (const id of panelPath) {
    const found = pool.find((node) => node.id === id);
    if (!found) {
      break;
    }
    chain.push(found);
    pool = found.children;
  }

  if (nodes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-8 text-center text-sm text-muted">
        No checklist items yet. Type a task above or pick subtasks from your main task.
      </p>
    );
  }

  return (
    <>
      <SortableItemList
        nodes={nodes}
        sessionId={sessionId}
        pickableSubtasks={pickableSubtasks}
        onOpenChildren={openChildren}
      />

      {chain.length > 0 && (
        <ChildrenPanel
          chain={chain}
          sessionId={sessionId}
          pickableSubtasks={pickableSubtasks}
          onOpenChildren={openChildren}
          onBack={goBack}
          onClose={closePanel}
        />
      )}
    </>
  );
}

function ChildrenPanel({
  chain,
  sessionId,
  pickableSubtasks,
  onOpenChildren,
  onBack,
  onClose,
}: {
  chain: SessionItemNode[];
  sessionId: string;
  pickableSubtasks: PickableSubtask[];
  onOpenChildren: (id: string) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const current = chain[chain.length - 1];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <button
        type="button"
        aria-label="Close child tasks"
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full flex-col overflow-hidden border-l border-border bg-background shadow-2xl animate-slide-in-right sm:max-w-md lg:max-w-lg">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {chain.length > 1 && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:bg-card-hover hover:text-foreground"
                aria-label="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {current.title}
              </p>
              <p className="truncate text-xs text-muted">
                {chain.map((node) => node.title).join(" / ")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:bg-card-hover hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {current.children.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-8 text-center text-sm text-muted">
              No child tasks yet.
            </p>
          ) : (
            <SortableItemList
              nodes={current.children}
              sessionId={sessionId}
              pickableSubtasks={pickableSubtasks}
              onOpenChildren={onOpenChildren}
            />
          )}

          <QuickAddChild sessionId={sessionId} parentItemId={current.id} />
        </div>
      </div>
    </div>
  );
}

function QuickAddChild({
  sessionId,
  parentItemId,
}: {
  sessionId: string;
  parentItemId: string;
}) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    const formData = new FormData();
    formData.set("title", trimmed);
    formData.set("parent_item_id", parentItemId);
    setTitle("");

    startTransition(async () => {
      await addSessionItemAction(sessionId, formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a child task..."
        enterKeyHint="done"
      />
      <Button
        type="submit"
        size="sm"
        disabled={pending || !title.trim()}
        className="shrink-0 gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </form>
  );
}

function SortableItemList({
  nodes: initialNodes,
  sessionId,
  pickableSubtasks,
  onOpenChildren,
}: {
  nodes: SessionItemNode[];
  sessionId: string;
  pickableSubtasks: PickableSubtask[];
  onOpenChildren: (id: string) => void;
}) {
  const [nodes, setNodes] = useState(initialNodes);
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();
  const listId = useId();

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
      sessionId={sessionId}
      sortable={mounted}
      pickableSubtasks={pickableSubtasks}
      onOpenChildren={onOpenChildren}
    />
  ));

  return (
    <ul className={cn("space-y-1", pending && "opacity-70")}>
      {mounted ? (
        <DndContext
          id={listId}
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
  sessionId,
  sortable,
  pickableSubtasks,
  onOpenChildren,
}: {
  node: SessionItemNode;
  priority: number;
  sessionId: string;
  sortable: boolean;
  pickableSubtasks: PickableSubtask[];
  onOpenChildren: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const isParent = node.children.length > 0;
  const isDone = node.status === "done";
  const sortableState = useSortable({ id: node.id, disabled: !sortable });

  const [celebrating, setCelebrating] = useState(false);
  const previousDoneRef = useRef(isDone);

  useEffect(() => {
    const wasDone = previousDoneRef.current;
    previousDoneRef.current = isDone;

    if (isDone && !wasDone) {
      setCelebrating(true);
      const timeout = window.setTimeout(
        () => setCelebrating(false),
        isParent ? 2200 : 900
      );
      return () => window.clearTimeout(timeout);
    }
  }, [isDone, isParent]);

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
          "group relative flex items-center gap-2 rounded-lg border border-transparent py-2 pr-2",
          motion.row,
          pending && "opacity-60",
          isParent && isDone && "border-success/30 bg-success/5",
          sortable &&
            sortableState.isDragging &&
            "relative z-10 border-border bg-card shadow-md"
        )}
      >
        {celebrating &&
          (isParent ? (
            <ConfettiBurst active count={28} />
          ) : (
            <EmojiPop active />
          ))}

        {sortable ? (
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-md border border-transparent text-muted hover:border-border hover:bg-card hover:text-primary active:cursor-grabbing active:border-primary/40 active:bg-primary/10 active:text-primary touch-none"
            style={{ touchAction: "none" }}
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
            onClick={() => onOpenChildren(node.id)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-card hover:text-foreground sm:h-7 sm:w-7"
            aria-label={`View child tasks for ${node.title}`}
          >
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
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

        <div
          className="min-w-0 flex-1"
          onClick={isParent ? () => onOpenChildren(node.id) : undefined}
          role={isParent ? "button" : undefined}
        >
          <span
            className={cn(
              "block text-sm",
              isParent && "cursor-pointer",
              isDone && "text-muted line-through decoration-muted"
            )}
          >
            {node.title}
          </span>
          {isParent ? (
            <span className="mt-0.5 inline-block text-[11px] text-muted">
              {node.children.filter((child) => child.status === "done").length}/
              {node.children.length} child tasks done
            </span>
          ) : (
            node.linked_subtask_id && (
              <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-accent">
                <Link2 className="h-3 w-3" />
                Synced with main task
              </span>
            )
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
      <PickSubtasksPopover sessionId={sessionId} pickableSubtasks={pickableSubtasks} />
    </div>
  );
}

function SubtaskPickRow({
  subtask,
  checked,
  linkedOnly,
  onToggle,
}: {
  subtask: PickableSubtask;
  checked: boolean;
  linkedOnly: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <li>
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
          onChange={() => onToggle(subtask.id)}
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
}

function SubtaskPickerPanel({
  sessionId,
  parentItemId,
  pickableSubtasks,
  onClose,
}: {
  sessionId: string;
  parentItemId: string | null;
  pickableSubtasks: PickableSubtask[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [pickWorkspace, setPickWorkspace] = useState<"office" | "personal">("office");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const linkedOnly = useContext(LinkedSessionContext);

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

  const groupedFiltered = useMemo(() => {
    if (linkedOnly) {
      return null;
    }

    const groups = new Map<string, PickableSubtask[]>();
    for (const item of filtered) {
      const key = item.category?.trim() || "Uncategorized";
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }

    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [filtered, linkedOnly]);

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
      ) : groupedFiltered ? (
        <div className="max-h-[45vh] space-y-4 overflow-y-auto sm:max-h-64">
          {groupedFiltered.map(([category, items]) => (
            <div key={category}>
              <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {category}
              </p>
              <ul className="space-y-2">
                {items.map((subtask) => (
                  <SubtaskPickRow
                    key={subtask.id}
                    subtask={subtask}
                    checked={selectedIds.has(subtask.id)}
                    linkedOnly={linkedOnly}
                    onToggle={toggleSelected}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="max-h-[45vh] space-y-2 overflow-y-auto sm:max-h-64">
          {filtered.map((subtask) => (
            <SubtaskPickRow
              key={subtask.id}
              subtask={subtask}
              checked={selectedIds.has(subtask.id)}
              linkedOnly={linkedOnly}
              onToggle={toggleSelected}
            />
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-xs text-muted">{selectedIds.size} selected</p>
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
  );
}

function PickSubtasksPopover({
  sessionId,
  pickableSubtasks,
}: {
  sessionId: string;
  pickableSubtasks: PickableSubtask[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen((value) => !value)}
        className="w-full gap-1.5 sm:w-auto"
      >
        <Link2 className="h-4 w-4" />
        Pick subtasks from main task
      </Button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 w-full rounded-xl border border-border bg-card p-3 shadow-2xl animate-scale-in sm:left-0 sm:right-auto sm:w-[26rem]">
          <p className="mb-3 text-xs text-muted">
            Tick one or more subtasks — they stay synced with your main task.
          </p>
          <SubtaskPickerPanel
            sessionId={sessionId}
            parentItemId={null}
            pickableSubtasks={pickableSubtasks}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
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
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setItemTitle("");
    }
  }, [open, initialMode]);

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
          <SubtaskPickerPanel
            sessionId={sessionId}
            parentItemId={parentItemId}
            pickableSubtasks={pickableSubtasks}
            onClose={onClose}
          />
        )}
      </div>
    </Modal>
  );
}
