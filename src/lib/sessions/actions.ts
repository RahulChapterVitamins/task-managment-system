"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateSubtask } from "@/lib/db/subtasks";
import {
  createSession,
  createSessionItem,
  deleteSession,
  deleteSessionItem,
  getSessionItems,
  moveUnfinishedItems,
  recalcAncestorStatuses,
  reorderSessionItems,
  reorderSessions,
  updateSession,
  updateSessionItem,
} from "@/lib/db/sessions";

export type SessionActionState = {
  error?: string;
  success?: string;
};

function revalidateSessions(sessionId?: string) {
  revalidatePath("/sessions");
  if (sessionId) {
    revalidatePath(`/sessions/${sessionId}`);
  }
  revalidatePath("/");
}

export async function createSessionAction(
  _prev: SessionActionState,
  formData: FormData
): Promise<SessionActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const linkedTaskId = String(formData.get("linked_task_id") ?? "").trim();
  const carryFromId = String(formData.get("carry_from_session_id") ?? "").trim();

  if (!title) {
    return { error: "Session title is required." };
  }

  let session;

  try {
    session = await createSession({
      title,
      linked_task_id: linkedTaskId || null,
    });

    if (carryFromId) {
      await moveUnfinishedItems(carryFromId, session.id);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create session.",
    };
  }

  revalidateSessions(session.id);
  redirect(`/sessions/${session.id}`);
}

export async function deleteSessionAction(sessionId: string) {
  try {
    await deleteSession(sessionId);
    revalidateSessions();
    redirect("/sessions");
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to delete session.");
  }
}

export async function markSessionDoneAction(sessionId: string) {
  try {
    await updateSession(sessionId, { status: "done" });
    revalidateSessions(sessionId);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to update session.");
  }
}

export async function reopenSessionAction(sessionId: string) {
  try {
    await updateSession(sessionId, { status: "active" });
    revalidateSessions(sessionId);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to reopen session.");
  }
}

export async function reorderSessionsAction(sessionIds: string[]) {
  try {
    await reorderSessions(sessionIds);
    revalidateSessions();
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to reorder sessions.");
  }
}

export async function addSessionItemAction(
  sessionId: string,
  formData: FormData
): Promise<SessionActionState> {
  try {
    const title = String(formData.get("title") ?? "").trim();
    const parentItemId = String(formData.get("parent_item_id") ?? "").trim();
    const linkedSubtaskId = String(formData.get("linked_subtask_id") ?? "").trim();

    if (!title && !linkedSubtaskId) {
      return { error: "Item title is required." };
    }

    await createSessionItem({
      session_id: sessionId,
      title: title || "Untitled",
      parent_item_id: parentItemId || null,
      linked_subtask_id: linkedSubtaskId || null,
    });

    revalidateSessions(sessionId);
    return { success: "Item added." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add item.",
    };
  }
}

export async function addLinkedSubtaskAction(
  sessionId: string,
  subtaskId: string,
  title: string,
  parentItemId?: string | null
): Promise<SessionActionState> {
  try {
    await createSessionItem({
      session_id: sessionId,
      title,
      parent_item_id: parentItemId ?? null,
      linked_subtask_id: subtaskId,
    });
    revalidateSessions(sessionId);
    return { success: "Subtask added." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add subtask.",
    };
  }
}

export async function toggleSessionItemAction(
  sessionId: string,
  itemId: string,
  currentStatus: "pending" | "done",
  linkedSubtaskId: string | null
) {
  try {
    const nextStatus = currentStatus === "done" ? "pending" : "done";
    const updated = await updateSessionItem(itemId, { status: nextStatus });

    if (linkedSubtaskId) {
      await updateSubtask(linkedSubtaskId, {
        status: nextStatus === "done" ? "done" : "pending",
      });
      revalidatePath("/");
      revalidatePath("/office");
      revalidatePath("/personal");
    }

    await recalcAncestorStatuses(sessionId, updated.parent_item_id);

    revalidateSessions(sessionId);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to toggle item.");
  }
}

export async function deleteSessionItemAction(sessionId: string, itemId: string) {
  try {
    await deleteSessionItem(itemId);
    revalidateSessions(sessionId);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to delete item.");
  }
}

export async function reorderSessionItemsAction(
  sessionId: string,
  itemIds: string[]
) {
  try {
    await reorderSessionItems(itemIds);
    revalidateSessions(sessionId);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to reorder items.");
  }
}

export async function getPendingItemCountAction(sessionId: string): Promise<number> {
  const items = await getSessionItems(sessionId);
  return items.filter(
    (item) => item.parent_item_id === null && item.status !== "done"
  ).length;
}
