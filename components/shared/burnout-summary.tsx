import {
  BookOpenIcon,
  BrainIcon,
  ClockIcon,
  FlameIcon,
  MoonIcon,
} from "lucide-react";

import type { BurnoutFactor } from "@/lib/student/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type RiskTheme = {
  badge: string;
  bar: string;
  ring: string;
  message: string;
};

const RISK_THEMES: Record<string, RiskTheme> = {
  Low: {
    badge: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
    ring: "ring-emerald-200",
    message: "You're doing well. Keep up your healthy routines.",
  },
  Moderate: {
    badge: "bg-amber-100 text-amber-900",
    bar: "bg-amber-500",
    ring: "ring-amber-200",
    message: "Some warning signs. Check the recommendations below.",
  },
  High: {
    badge: "bg-orange-100 text-orange-900",
    bar: "bg-orange-500",
    ring: "ring-orange-200",
    message: "Your burnout risk is high. Please review the recommended actions.",
  },
  Severe: {
    badge: "bg-rose-100 text-rose-900",
    bar: "bg-rose-500",
    ring: "ring-rose-200",
    message:
      "Your burnout risk is severe. Consider reaching out to the guidance office.",
  },
};

const DEFAULT_RISK_THEME: RiskTheme = {
  badge: "bg-muted text-muted-foreground",
  bar: "bg-primary",
  ring: "ring-foreground/10",
  message: "Submit your weekly monitoring to see your burnout risk.",
};

export function getRiskTheme(level: string | null | undefined): RiskTheme {
  return (level && RISK_THEMES[level]) || DEFAULT_RISK_THEME;
}

export function BurnoutHero({
  level,
  mfbiScore,
  weekLabel,
  description,
  children,
}: {
  level: string | null;
  mfbiScore: number | null;
  weekLabel?: string | null;
  /** Overrides the default student-facing message. */
  description?: string | null;
  /** Rendered under the MFBI bar (e.g. CTA button or status text). */
  children?: React.ReactNode;
}) {
  const theme = getRiskTheme(level);
  const mfbiPercent = mfbiScore != null ? Math.round(mfbiScore * 100) : null;

  return (
    <Card className={cn("ring-2", theme.ring)}>
      <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl [&_svg]:size-6",
              theme.badge
            )}
          >
            <FlameIcon />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">
              Current burnout risk
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
                {level ?? "No data"}
              </span>
              {weekLabel ? (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    theme.badge
                  )}
                >
                  {weekLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {description ?? theme.message}
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Burnout index (MFBI)</span>
            <span className="font-medium tabular-nums">
              {mfbiScore != null ? mfbiScore.toFixed(2) : "—"}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", theme.bar)}
              style={{ width: `${Math.max(mfbiPercent ?? 0, 2)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
            <span>Severe</span>
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function factorTone(normalized: number) {
  if (normalized < 1 / 3) return "bg-emerald-500";
  if (normalized < 2 / 3) return "bg-amber-500";
  return "bg-rose-500";
}

function FactorCard({
  icon,
  label,
  description,
  factor,
  rawLabel,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  factor: BurnoutFactor | null;
  rawLabel?: string;
}) {
  const percent = factor ? Math.round(factor.normalized * 100) : null;

  return (
    <Card size="sm">
      <CardHeader className="gap-1">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
          <CardTitle className="text-sm">{label}</CardTitle>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {factor ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums">
                {percent}%
              </span>
              <span className="text-xs text-muted-foreground">
                {rawLabel ?? `Score: ${factor.raw}`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  factorTone(factor.normalized)
                )}
                style={{ width: `${Math.max(percent ?? 0, 3)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Contribution to the burnout score — lower is better.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export type BurnoutFactors = {
  stress: BurnoutFactor;
  workload: BurnoutFactor;
  studyTime: BurnoutFactor;
  sleep: BurnoutFactor;
};

export function BurnoutFactorSection({
  factors,
  stressLevel,
  heading = "What makes up the burnout score",
  subheading = "The burnout index combines these four factors from the latest weekly monitoring.",
}: {
  factors: BurnoutFactors | null;
  stressLevel?: string | null;
  heading?: string;
  subheading?: string;
}) {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
        {heading}
      </h2>
      <p className="text-sm text-muted-foreground">{subheading}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FactorCard
          icon={<BrainIcon />}
          label="Perceived Stress"
          description="How stressed the past week felt (PSS)."
          factor={factors?.stress ?? null}
          rawLabel={
            factors
              ? `PSS: ${factors.stress.raw}/40${stressLevel ? ` · ${stressLevel}` : ""}`
              : undefined
          }
        />
        <FactorCard
          icon={<BookOpenIcon />}
          label="Academic Workload"
          description="How heavy schoolwork feels."
          factor={factors?.workload ?? null}
        />
        <FactorCard
          icon={<ClockIcon />}
          label="Study Time"
          description="Time spent studying each day."
          factor={factors?.studyTime ?? null}
        />
        <FactorCard
          icon={<MoonIcon />}
          label="Sleep Hours"
          description="Sleeping patterns and duration."
          factor={factors?.sleep ?? null}
        />
      </div>
    </div>
  );
}
