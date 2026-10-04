import { TASK_STATUSES } from "@/lib/constants/task-status";
import type { TaskListItem } from "@/lib/db/queries";
import type { TaskStatus } from "@/lib/types/app";

const HEADERS = [
  "Workspace",
  "Title",
  "Category",
  "Status",
  "Progress %",
  "Start Date",
  "Due Date",
  "Purpose",
  "Expected Result",
] as const;

function formatDate(date: string | null): string {
  if (!date) {
    return "";
  }

  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: TaskStatus): string {
  return TASK_STATUSES.find((item) => item.value === status)?.label ?? status;
}

function escapeCsvCell(value: string): string {
  const cell = value.replace(/\r?\n/g, " ").trim();

  if (/[",]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }

  return cell;
}

function tasksToRows(tasks: TaskListItem[]): string[][] {
  return tasks.map((task) => [
    task.workspace,
    task.title,
    task.category ?? "",
    statusLabel(task.status),
    String(task.progress),
    formatDate(task.timeline_start),
    formatDate(task.timeline_end),
    task.purpose ?? "",
    task.expected_result ?? "",
  ]);
}

export function formatAllTasksForCsv(
  officeTasks: TaskListItem[],
  personalTasks: TaskListItem[]
): string {
  const rows = [...tasksToRows(officeTasks), ...tasksToRows(personalTasks)];

  return [HEADERS, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(","))
    .join("\r\n");
}

export function downloadAllTasksCsv(
  officeTasks: TaskListItem[],
  personalTasks: TaskListItem[]
): void {
  const csv = formatAllTasksForCsv(officeTasks, personalTasks);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);

  const link = document.createElement("a");
  link.href = url;
  link.download = `taskflow-tasks-${dateStamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
