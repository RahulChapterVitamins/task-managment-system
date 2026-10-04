import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  className,
  actions,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-border bg-card/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-muted sm:text-sm">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
