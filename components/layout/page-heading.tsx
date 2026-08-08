import type { LucideIcon } from "lucide-react";

export function PageHeading({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {Icon ? (
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
          ) : null}
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
