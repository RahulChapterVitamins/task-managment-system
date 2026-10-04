import Link from "next/link";
import { ArrowRight, Briefcase, CalendarDays, Sun, Target, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceStats, getDueSoonTasks } from "@/lib/db/tasks";
import { ContinueTaskCard } from "@/components/tasks/continue-task-card";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { formatTimelineDate } from "@/lib/progress";
import type { Task } from "@/lib/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [officeStats, personalStats, officeDueSoon, personalDueSoon] =
    await Promise.all([
      getWorkspaceStats("office"),
      getWorkspaceStats("personal"),
      getDueSoonTasks("office"),
      getDueSoonTasks("personal"),
    ]);

  const firstName = formatFirstName(user?.email);
  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative flex min-h-full min-w-0 flex-1 flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(94,179,255,0.14),_transparent_42%),radial-gradient(circle_at_bottom,_rgba(125,211,224,0.1),_transparent_40%)]" />

      <DashboardHeader />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col px-4 py-5 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-5xl min-w-0 text-center">
          <p className="text-sm text-muted">{getGreeting()},</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground sm:mt-2 sm:text-5xl">
            {firstName}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Choose your workspace to continue
          </p>
        </div>

        <div className="mx-auto mt-5 w-full max-w-5xl min-w-0 space-y-4 sm:mt-8 sm:space-y-6 animate-fade-in">
          <QuickLinks />

          <ContinueTaskCard />

          <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
            <WorkspaceCard
              emoji="💼"
              title="Office"
              subtitle="Work tasks and deliverables"
              activeLabel="Active Tasks"
              activeCount={officeStats.active}
              dueCount={officeStats.dueThisWeek}
              href="/office"
              buttonLabel="Enter Office"
              dueSoon={officeDueSoon}
            />
            <WorkspaceCard
              emoji="🎯"
              title="Personal"
              subtitle="Long-term goals and learning"
              activeLabel="Active Goals"
              activeCount={personalStats.active}
              dueCount={personalStats.dueThisWeek}
              href="/personal"
              buttonLabel="Enter Personal"
              dueSoon={personalDueSoon}
            />
          </div>
        </div>
      </div>

      <footer className="relative z-10 border-t border-border/60 px-4 py-3 text-center text-xs text-muted sm:py-4 sm:text-sm">
        Month: {monthLabel}
      </footer>
    </div>
  );
}

function QuickLinks() {
  const links = [
    { href: "/today", label: "Today", icon: Sun },
    { href: "/sessions", label: "Sessions", icon: Timer },
    { href: "/office", label: "Office", icon: Briefcase },
    { href: "/personal", label: "Personal", icon: Target },
    { href: "/monthly", label: "Monthly", icon: CalendarDays },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2.5 text-sm font-medium text-foreground motion-safe:transition-colors hover:border-primary/40 hover:bg-card sm:py-3"
        >
          <Icon className="h-4 w-4 shrink-0 text-accent" />
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function formatFirstName(email?: string | null) {
  if (!email) {
    return "there";
  }

  const localPart = email.split("@")[0] ?? "there";
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type WorkspaceCardProps = {
  emoji: string;
  title: string;
  subtitle: string;
  activeLabel: string;
  activeCount: number;
  dueCount: number;
  href: string;
  buttonLabel: string;
  dueSoon: Task[];
};

function WorkspaceCard({
  emoji,
  title,
  subtitle,
  activeLabel,
  activeCount,
  dueCount,
  href,
  buttonLabel,
  dueSoon,
}: WorkspaceCardProps) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-border/80 bg-card/90 p-4 shadow-lg shadow-black/10 backdrop-blur-sm sm:p-6 sm:shadow-xl sm:shadow-black/20 motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out lg:motion-safe:hover:-translate-y-1 lg:motion-safe:hover:border-primary/40 lg:motion-safe:hover:bg-card lg:motion-safe:hover:shadow-2xl lg:motion-safe:hover:shadow-primary/10">
      <div className="flex min-w-0 items-center gap-3 sm:items-start sm:gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl">
          {emoji}
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted sm:mt-1 sm:text-sm">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:mt-6 sm:gap-4">
        <StatBlock label={activeLabel} value={activeCount} />
        <StatBlock label="Due This Week" shortLabel="Due Week" value={dueCount} accent />
      </div>

      {dueSoon.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg bg-background/50 px-3 py-2 text-xs text-muted sm:mt-4 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm">
          {dueSoon.slice(0, 2).map((task) => (
            <li key={task.id} className="truncate">
              {task.title} · {formatTimelineDate(task.timeline_end)}
            </li>
          ))}
        </ul>
      )}

      <Link href={href} className="mt-4 sm:mt-6">
        <Button className="w-full gap-2">
          {buttonLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

function StatBlock({
  label,
  shortLabel,
  value,
  accent = false,
}: {
  label: string;
  shortLabel?: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-background/60 px-3 py-2.5 sm:rounded-xl sm:px-4 sm:py-3">
      <p className={`text-xl font-bold sm:text-2xl ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted sm:mt-1 sm:text-xs">
        <span className="sm:hidden">{shortLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </p>
    </div>
  );
}
