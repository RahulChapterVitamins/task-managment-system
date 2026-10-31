import { createClient } from "@/lib/supabase/server";
import { assertList, assertNoError, assertSingle } from "@/lib/db/utils";
import type { Session, SessionItem } from "@/lib/types/database";

export type SessionItemNode = SessionItem & {
  children: SessionItemNode[];
};

export async function getSessions(): Promise<Session[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("sessions")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return assertList("getSessions", result);
}

export async function getSession(id: string): Promise<Session | null> {
  const supabase = await createClient();
  const result = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (result.error) {
    throw new Error(`getSession: ${result.error.message}`);
  }

  return result.data;
}

export async function getNextSessionSortOrder(): Promise<number> {
  const supabase = await createClient();
  const result = await supabase
    .from("sessions")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new Error(`getNextSessionSortOrder: ${result.error.message}`);
  }

  return (result.data?.sort_order ?? -1) + 1;
}

export async function createSession(input: {
  title: string;
  linked_task_id?: string | null;
  sort_order?: number;
}): Promise<Session> {
  const supabase = await createClient();
  const sortOrder = input.sort_order ?? (await getNextSessionSortOrder());

  const result = await supabase
    .from("sessions")
    .insert({
      title: input.title,
      linked_task_id: input.linked_task_id ?? null,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  return assertSingle("createSession", result);
}

export async function updateSession(
  id: string,
  input: Partial<Pick<Session, "title" | "linked_task_id" | "status" | "sort_order">>
): Promise<Session> {
  const supabase = await createClient();
  const result = await supabase
    .from("sessions")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  return assertSingle("updateSession", result);
}

export async function deleteSession(id: string): Promise<void> {
  const supabase = await createClient();
  const result = await supabase.from("sessions").delete().eq("id", id);
  assertNoError("deleteSession", { data: null, error: result.error });
}

export async function reorderSessions(sessionIds: string[]): Promise<void> {
  if (sessionIds.length === 0) {
    return;
  }

  const supabase = await createClient();
  const updates = sessionIds.map((id, index) =>
    supabase.from("sessions").update({ sort_order: index }).eq("id", id)
  );
  const results = await Promise.all(updates);

  for (const result of results) {
    assertNoError("reorderSessions", { data: null, error: result.error });
  }
}

export async function getSessionItems(sessionId: string): Promise<SessionItem[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("session_items")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return assertList("getSessionItems", result);
}

export async function getSessionItemsBySessionIds(
  sessionIds: string[]
): Promise<SessionItem[]> {
  if (sessionIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const result = await supabase
    .from("session_items")
    .select("*")
    .in("session_id", sessionIds)
    .order("sort_order", { ascending: true });

  return assertList("getSessionItemsBySessionIds", result);
}

export async function getNextSessionItemSortOrder(
  sessionId: string,
  parentItemId: string | null = null
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from("session_items")
    .select("sort_order")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: false })
    .limit(1);

  query = parentItemId
    ? query.eq("parent_item_id", parentItemId)
    : query.is("parent_item_id", null);

  const result = await query.maybeSingle();

  if (result.error) {
    throw new Error(`getNextSessionItemSortOrder: ${result.error.message}`);
  }

  return (result.data?.sort_order ?? -1) + 1;
}

export async function createSessionItem(input: {
  session_id: string;
  title: string;
  parent_item_id?: string | null;
  linked_subtask_id?: string | null;
  sort_order?: number;
}): Promise<SessionItem> {
  const supabase = await createClient();
  const parentItemId = input.parent_item_id ?? null;
  const sortOrder =
    input.sort_order ??
    (await getNextSessionItemSortOrder(input.session_id, parentItemId));

  const result = await supabase
    .from("session_items")
    .insert({
      session_id: input.session_id,
      title: input.title,
      parent_item_id: parentItemId,
      linked_subtask_id: input.linked_subtask_id ?? null,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  return assertSingle("createSessionItem", result);
}

export async function updateSessionItem(
  id: string,
  input: Partial<
    Pick<SessionItem, "title" | "status" | "sort_order" | "session_id" | "parent_item_id">
  >
): Promise<SessionItem> {
  const supabase = await createClient();
  const result = await supabase
    .from("session_items")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  return assertSingle("updateSessionItem", result);
}

export async function deleteSessionItem(id: string): Promise<void> {
  const supabase = await createClient();
  const result = await supabase.from("session_items").delete().eq("id", id);
  assertNoError("deleteSessionItem", { data: null, error: result.error });
}

export async function reorderSessionItems(itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) {
    return;
  }

  const supabase = await createClient();
  const updates = itemIds.map((id, index) =>
    supabase.from("session_items").update({ sort_order: index }).eq("id", id)
  );
  const results = await Promise.all(updates);

  for (const result of results) {
    assertNoError("reorderSessionItems", { data: null, error: result.error });
  }
}

/** Move unfinished root items (+ their descendants) from one session to another */
export async function moveUnfinishedItems(
  fromSessionId: string,
  toSessionId: string
): Promise<number> {
  const items = await getSessionItems(fromSessionId);
  const unfinishedRoots = items.filter(
    (item) => item.parent_item_id === null && item.status !== "done"
  );

  if (unfinishedRoots.length === 0) {
    return 0;
  }

  const idsToMove = new Set<string>();
  for (const root of unfinishedRoots) {
    idsToMove.add(root.id);
    collectDescendants(items, root.id, idsToMove);
  }

  const startOrder = await getNextSessionItemSortOrder(toSessionId, null);
  let orderOffset = 0;

  for (const item of items) {
    if (!idsToMove.has(item.id)) {
      continue;
    }

    if (item.parent_item_id === null) {
      await updateSessionItem(item.id, {
        session_id: toSessionId,
        sort_order: startOrder + orderOffset,
      });
      orderOffset += 1;
    } else {
      await updateSessionItem(item.id, {
        session_id: toSessionId,
      });
    }
  }

  return unfinishedRoots.length;
}

function collectDescendants(
  items: SessionItem[],
  parentId: string,
  into: Set<string>
) {
  for (const item of items) {
    if (item.parent_item_id === parentId) {
      into.add(item.id);
      collectDescendants(items, item.id, into);
    }
  }
}

/**
 * After a session item's status changes, walk up its ancestor chain and set
 * each ancestor to "done" when every one of its direct children is done, or
 * back to "pending" otherwise. Stops at the first ancestor whose status
 * doesn't need to change (nothing above it can change either).
 */
export async function recalcAncestorStatuses(
  sessionId: string,
  startParentId: string | null
): Promise<void> {
  if (!startParentId) {
    return;
  }

  const supabase = await createClient();
  const items = await getSessionItems(sessionId);
  const itemsById = new Map(items.map((item) => [item.id, item]));

  let currentParentId: string | null = startParentId;

  while (currentParentId) {
    const parent = itemsById.get(currentParentId);
    if (!parent) {
      break;
    }

    const children = items.filter((item) => item.parent_item_id === currentParentId);
    if (children.length === 0) {
      break;
    }

    const nextStatus = children.every((child) => child.status === "done")
      ? "done"
      : "pending";

    if (parent.status === nextStatus) {
      break;
    }

    const result = await supabase
      .from("session_items")
      .update({ status: nextStatus })
      .eq("id", parent.id);

    assertNoError("recalcAncestorStatuses", { data: null, error: result.error });

    parent.status = nextStatus;
    currentParentId = parent.parent_item_id;
  }
}

export function buildSessionItemTree(items: SessionItem[]): SessionItemNode[] {
  const map = new Map<string, SessionItemNode>();

  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  const roots: SessionItemNode[] = [];

  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parent_item_id && map.has(item.parent_item_id)) {
      map.get(item.parent_item_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortNodes(nodes: SessionItemNode[]) {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    for (const node of nodes) {
      sortNodes(node.children);
    }
  }

  sortNodes(roots);
  return roots;
}

export function calculateSessionProgress(items: SessionItem[]): number {
  const leaves = items.filter(
    (item) => !items.some((other) => other.parent_item_id === item.id)
  );

  if (leaves.length === 0) {
    const roots = items.filter((item) => item.parent_item_id === null);
    if (roots.length === 0) {
      return 0;
    }
    const done = roots.filter((item) => item.status === "done").length;
    return Math.round((done / roots.length) * 100);
  }

  const done = leaves.filter((item) => item.status === "done").length;
  return Math.round((done / leaves.length) * 100);
}
