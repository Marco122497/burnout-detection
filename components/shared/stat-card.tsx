import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "low" | "moderate" | "high" | "warning";

const VALUE_TONES: Record<StatTone, string> = {
  neutral: "text-foreground",
  low: "text-emerald-700 dark:text-emerald-400",
  moderate: "text-amber-700 dark:text-amber-400",
  high: "text-orange-700 dark:text-orange-400",
  warning: "text-amber-800 dark:text-amber-300",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  size = "default",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatTone;
  /** lg = headline cards (bigger number). */
  size?: "default" | "lg";
  className?: string;
}) {
  return (
    <Card className={cn("h-full min-w-0 gap-0 py-0", className)}>
      <div className="flex h-full min-w-0 flex-col items-center justify-center gap-1 p-4 text-center">
        <p
          title={label}
          className="w-full truncate text-sm font-medium text-muted-foreground"
        >
          {label}
        </p>
        <p
          className={cn(
            "w-full truncate leading-none font-bold tracking-tight tabular-nums",
            size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl",
            VALUE_TONES[tone]
          )}
        >
          {value}
        </p>
        {hint ? (
          <p
            title={hint}
            className="w-full truncate text-xs text-muted-foreground"
          >
            {hint}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
