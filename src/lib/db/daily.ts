import { createClient } from "@/lib/supabase/server";
import { assertList, assertNoError, assertSingle } from "@/lib/db/utils";
import type { DailyPriority } from "@/lib/types/database";

function normalizeDate(date: string): string {
  return date.slice(0, 10);
}

export async function getDailyPriorities(date: string): Promise<DailyPriority[]> {
  const supabase = await createClient();
  const priorityDate = normalizeDate(date);

  const result = await supabase
    .from("daily_priorities")
    .select("*")
    .eq("priority_date", priorityDate)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return assertList("getDailyPriorities", result);
}

export async function getDailyPriorityTaskIds(date: string): Promise<string[]> {
  const rows = await getDailyPriorities(date);
  return rows.map((row) => row.task_id);
}

export async function getIncompleteDailyTaskIds(date: string): Promise<string[]> {
  const dailyRows = await getDailyPriorities(date);

  if (dailyRows.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const taskIds = dailyRows.map((row) => row.task_id);

  const result = await supabase.from("tasks").select("id, status").in("id", taskIds);

  if (result.error) {
    throw new Error(`getIncompleteDailyTaskIds: ${result.error.message}`);
  }

  return (result.data ?? [])
    .filter((task) => task.status !== "done")
    .map((task) => task.id);
}

export async function addDailyPriority(
  date: string,
  taskId: string
): Promise<DailyPriority> {
  const supabase = await createClient();
  const priorityDate = normalizeDate(date);

  const taskResult = await supabase
    .from("tasks")
    .select("workspace")
    .eq("id", taskId)
    .single();

  if (taskResult.error || !taskResult.data) {
    throw new Error(`addDailyPriority: task not found`);
  }

  const sortOrder = await getNextDailySortOrder(
    priorityDate,
    taskResult.data.workspace
  );

  const result = await supabase
    .from("daily_priorities")
    .insert({
      priority_date: priorityDate,
      task_id: taskId,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  return assertSingle("addDailyPriority", result);
}

export async function removeDailyPriority(
  date: string,
  taskId: string
): Promise<void> {
  const supabase = await createClient();
  const priorityDate = normalizeDate(date);

  const result = await supabase
    .from("daily_priorities")
    .delete()
    .eq("priority_date", priorityDate)
    .eq("task_id", taskId);

  assertNoError("removeDailyPriority", { data: null, error: result.error });
}

export async function reorderDailyPriorities(
  date: string,
  taskIds: string[]
): Promise<void> {
  if (taskIds.length === 0) {
    return;
  }

  const supabase = await createClient();
  const priorityDate = normalizeDate(date);

  const updates = taskIds.map((taskId, index) =>
    supabase
      .from("daily_priorities")
      .update({ sort_order: index })
      .eq("priority_date", priorityDate)
      .eq("task_id", taskId)
  );

  const results = await Promise.all(updates);

  for (const result of results) {
    assertNoError("reorderDailyPriorities", { data: null, error: result.error });
  }
}

export async function getNextDailySortOrder(
  date: string,
  workspace: "office" | "personal"
): Promise<number> {
  const supabase = await createClient();
  const priorityDate = normalizeDate(date);
  const dailyRows = await getDailyPriorities(priorityDate);

  if (dailyRows.length === 0) {
    return 0;
  }

  const taskIds = dailyRows.map((row) => row.task_id);
  const tasksResult = await supabase
    .from("tasks")
    .select("id")
    .in("id", taskIds)
    .eq("workspace", workspace);

  if (tasksResult.error) {
    throw new Error(`getNextDailySortOrder: ${tasksResult.error.message}`);
  }

  const workspaceTaskIds = new Set((tasksResult.data ?? []).map((task) => task.id));
  let maxOrder = -1;

  for (const row of dailyRows) {
    if (workspaceTaskIds.has(row.task_id)) {
      maxOrder = Math.max(maxOrder, row.sort_order);
    }
  }

  return maxOrder + 1;
}

const STREAK_LOOKBACK_DAYS = 30;

function shiftDateString(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Counts consecutive prior days (not including `today`) where every task
 * picked for that day currently has status "done". Best-effort: it reads
 * current task status, not a historical snapshot, so reopening an old task
 * will retroactively break the streak.
 */
export async function getTodayStreak(today: string): Promise<number> {
  const supabase = await createClient();
  const todayDate = normalizeDate(today);
  const sinceDate = shiftDateString(todayDate, -STREAK_LOOKBACK_DAYS);

  const priorityResult = await supabase
    .from("daily_priorities")
    .select("priority_date, task_id")
    .gte("priority_date", sinceDate)
    .lt("priority_date", todayDate);

  if (priorityResult.error) {
    throw new Error(`getTodayStreak: ${priorityResult.error.message}`);
  }

  const rows = priorityResult.data ?? [];

  if (rows.length === 0) {
    return 0;
  }

  const taskIds = [...new Set(rows.map((row) => row.task_id))];
  const tasksResult = await supabase
    .from("tasks")
    .select("id, status")
    .in("id", taskIds);

  if (tasksResult.error) {
    throw new Error(`getTodayStreak: ${tasksResult.error.message}`);
  }

  const statusById = new Map(
    (tasksResult.data ?? []).map((task) => [task.id, task.status])
  );

  const taskIdsByDate = new Map<string, string[]>();
  for (const row of rows) {
    const list = taskIdsByDate.get(row.priority_date) ?? [];
    list.push(row.task_id);
    taskIdsByDate.set(row.priority_date, list);
  }

  let streak = 0;
  let cursor = shiftDateString(todayDate, -1);

  while (true) {
    const idsForDay = taskIdsByDate.get(cursor);

    if (!idsForDay || idsForDay.length === 0) {
      break;
    }

    const allDone = idsForDay.every((id) => statusById.get(id) === "done");

    if (!allDone) {
      break;
    }

    streak += 1;
    cursor = shiftDateString(cursor, -1);
  }

  return streak;
}
