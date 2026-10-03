"use client";

import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function DashboardHeader() {
  return (
    <header className="relative z-10 flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-8 sm:py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        Taskflow
      </p>
      <div className="flex items-center gap-2">
        <ThemeToggle compact />
        <form action={signOut}>
          <Button type="submit" variant="secondary" size="sm">
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}
