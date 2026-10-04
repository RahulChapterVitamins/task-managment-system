"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav } from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type SidebarProps = {
  userEmail?: string | null;
  onNavigate?: () => void;
};

export function Sidebar({ userEmail, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const displayName = userEmail?.split("@")[0] ?? "User";

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-card">
      <div className="shrink-0 border-b border-border px-4 py-5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold tracking-tight text-primary">
            TaskFlow
          </p>
          <ThemeToggle compact />
        </div>
        <p className="mt-2 truncate text-sm text-muted">Welcome, {displayName}</p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
        {mainNav.map(({ label, href, icon: Icon, match }) => {
          const isActive = match ? match(pathname) : pathname === href;

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium motion-safe:transition-all",
                isActive
                  ? "nav-active-pill shadow-sm"
                  : "text-muted hover:bg-card-hover hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border p-4">
        <p className="mb-3 truncate text-left text-xs text-muted">{userEmail}</p>
        <form action={signOut}>
          <Button type="submit" variant="secondary" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
        <p className="mt-3 text-left text-xs text-muted">
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </aside>
  );
}
