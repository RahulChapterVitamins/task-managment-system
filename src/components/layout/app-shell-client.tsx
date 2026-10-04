"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { mainNav } from "@/lib/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils/cn";

type AppShellClientProps = {
  userEmail?: string | null;
  children: React.ReactNode;
  modal: React.ReactNode;
};

export function AppShellClient({ userEmail, children, modal }: AppShellClientProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hideSidebar = pathname === "/";

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background">
      {!hideSidebar && (
        <>
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
            <Sidebar userEmail={userEmail} />
          </aside>

          {open && (
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setOpen(false)}
            />
          )}

          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 lg:hidden",
              open ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <Sidebar userEmail={userEmail} onNavigate={() => setOpen(false)} />
          </aside>
        </>
      )}

      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col",
          !hideSidebar && "lg:pl-64"
        )}
      >
        {!hideSidebar && (
          <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground motion-safe:transition-all motion-safe:duration-150 hover:border-border-muted hover:bg-card-hover active:scale-95"
              aria-label="Open menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/" className="flex-1 font-display text-base font-semibold tracking-tight text-primary">
              TaskFlow
            </Link>
            <ThemeToggle compact />
          </div>
        )}
        <main className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">{children}</main>
      </div>

      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {mainNav
          .filter((item) => item.label !== "Monthly Progress")
          .map(({ label, href, icon: Icon, match }) => {
            const isActive = match ? match(pathname) : pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-card-hover",
                  isActive ? "text-primary" : "text-muted"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
      </nav>

      {modal}
    </div>
  );
}
