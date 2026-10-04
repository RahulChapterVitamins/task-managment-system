import { PageHeader } from "@/components/layout/page-header";
import { TodayBoard } from "@/components/today/today-board";
import {
  getAvailableTasksForToday,
  getTodayTasksWithProgress,
} from "@/lib/db/queries";
import { getTodayStreak } from "@/lib/db/daily";

type TodayPageProps = {
  searchParams: Promise<{ date?: string }>;
};

function resolveDate(input?: string) {
  if (input?.trim()) {
    return input.slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const params = await searchParams;
  const date = resolveDate(params.date);
  const isRealToday = date === resolveDate();

  const [todayTasks, availableTasks, streak] = await Promise.all([
    getTodayTasksWithProgress(date),
    getAvailableTasksForToday(date),
    isRealToday ? getTodayStreak(date) : Promise.resolve(0),
  ]);

  const label = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <PageHeader
        title="Today"
        description={`Daily focus list for ${label}. Pick tasks and set priority for this day only.`}
        actions={
          <form method="GET" className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-card-hover"
            >
              Go
            </button>
          </form>
        }
      />

      <div className="flex min-w-0 flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 animate-fade-in">
        <TodayBoard
          date={date}
          todayTasks={todayTasks}
          availableTasks={availableTasks}
          streak={isRealToday ? streak : null}
        />
      </div>
    </>
  );
}
