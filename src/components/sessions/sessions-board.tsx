"use client";

import { useEffect, useState, useTransition } from "react";
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
import { GripVertical, Trash2 } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import {
  deleteSessionAction,
  reorderSessionsAction,
} from "@/lib/sessions/actions";
import { cn } from "@/lib/utils/cn";

export type SessionListItem = {
  id: string;
  title: string;
  status: "active" | "done";
  progress: number;
  itemCount: number;
  doneCount: number;
  linkedTaskTitle: string | null;
  createdAt: string;
};

type SessionsBoardProps = {
  sessions: SessionListItem[];
};

export function SessionsBoard({ sessions: initial }: SessionsBoardProps) {
  const [sessions, setSessions] = useState(initial);
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSessions(initial);
  }, [initial]);

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

    const oldIndex = sessions.findIndex((session) => session.id === active.id);
    const newIndex = sessions.findIndex((session) => session.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const next = arrayMove(sessions, oldIndex, newIndex);
    setSessions(next);
    startTransition(async () => {
      await reorderSessionsAction(next.map((session) => session.id));
    });
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
        <p className="font-medium text-foreground">No sessions yet</p>
        <p className="mt-2 text-sm text-muted">
          Create a session for your next hourly checklist.
        </p>
      </div>
    );
  }

  const list = (
    <ul className={cn("space-y-3", pending && "opacity-70")}>
      {sessions.map((session, index) => (
        <SessionCard
          key={session.id}
          session={session}
          priority={index + 1}
          sortable={mounted}
        />
      ))}
    </ul>
  );

  if (!mounted) {
    return list;
  }

  return (
    <DndContext
      id="sessions-board"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sessions.map((session) => session.id)}
        strategy={verticalListSortingStrategy}
      >
        {list}
      </SortableContext>
    </DndContext>
  );
}

function SessionCard({
  session,
  priority,
  sortable,
}: {
  session: SessionListItem;
  priority: number;
  sortable: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const sortableState = useSortable({ id: session.id, disabled: !sortable });

  function handleDelete() {
    if (!window.confirm(`Delete session "${session.title}"?`)) {
      return;
    }
    startTransition(async () => {
      await deleteSessionAction(session.id);
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
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        session.status === "done" && "opacity-70",
        sortable && sortableState.isDragging && "relative z-10 shadow-lg"
      )}
    >
      <div className="flex items-start gap-3">
        {sortable ? (
          <button
            type="button"
            className="mt-0.5 inline-flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-lg border border-transparent text-muted hover:border-border hover:bg-background hover:text-primary active:cursor-grabbing active:border-primary/40 active:bg-primary/10 active:text-primary touch-manipulation"
            aria-label={`Reorder ${session.title}`}
            {...sortableState.attributes}
            {...sortableState.listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        ) : (
          <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center text-muted">
            <GripVertical className="h-5 w-5 opacity-30" />
          </span>
        )}

        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-accent">
          {priority}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/sessions/${session.id}`}
                className="block truncate font-semibold text-foreground hover:text-accent"
              >
                {session.title}
              </Link>
              <p className="mt-1 text-xs text-muted">
                {session.status === "done" ? "Completed" : "Active"}
                {" · "}
                {session.doneCount}/{session.itemCount} items
                {session.linkedTaskTitle
                  ? ` · Linked: ${session.linkedTaskTitle}`
                  : " · Independent"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link href={`/sessions/${session.id}`}>
                <Button size="sm" variant="secondary">
                  Open
                </Button>
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
                aria-label="Delete session"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <ProgressBar value={session.progress} showLabel size="sm" />
        </div>
      </div>
    </li>
  );
}
