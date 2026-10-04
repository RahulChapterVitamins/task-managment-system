"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type TaskDetailModalProps = {
  children: React.ReactNode;
};

export function TaskDetailModal({ children }: TaskDetailModalProps) {
  const router = useRouter();

  function close() {
    router.back();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <button
        type="button"
        aria-label="Close task details"
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px] animate-fade-in"
        onClick={close}
      />
      <div className="relative flex h-full w-full flex-col overflow-hidden border-l border-border bg-background shadow-2xl animate-slide-in-right sm:max-w-xl lg:max-w-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/60 px-4 py-3 sm:px-6">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Task details
          </span>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:bg-card-hover hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
