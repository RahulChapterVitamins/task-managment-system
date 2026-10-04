"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadAllTasksCsv } from "@/lib/export/all-tasks-to-csv";
import type { TaskListItem } from "@/lib/db/queries";

type DownloadAllTasksButtonProps = {
  officeTasks: TaskListItem[];
  personalTasks: TaskListItem[];
};

export function DownloadAllTasksButton({
  officeTasks,
  personalTasks,
}: DownloadAllTasksButtonProps) {
  const total = officeTasks.length + personalTasks.length;

  function handleDownload() {
    downloadAllTasksCsv(officeTasks, personalTasks);
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={total === 0}
      onClick={handleDownload}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Download all tasks (Excel)
    </Button>
  );
}
