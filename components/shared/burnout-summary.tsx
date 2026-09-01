import {
  BookOpenIcon,
  BrainIcon,
  ClockIcon,
  FlameIcon,
  MoonIcon,
} from "lucide-react";

import type { BurnoutFactor } from "@/lib/student/dashboard";
import { classifyMfbiScore } from "@/lib/student/mfbi";
import { formatNormalizedFactor } from "@/components/shared/risk-display";
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
  title: string;
  card: string;
  mfbi: string;
  message: string;
};

const RISK_THEMES: Record<string, RiskTheme> = {
  Low: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    bar: "bg-emerald-500",
    ring: "ring-emerald-200 dark:ring-emerald-900",
    title: "text-emerald-700 dark:text-emerald-400",
    card: "bg-emerald-50/50 dark:bg-emerald-950/15",
    mfbi: "text-emerald-700 dark:text-emerald-400",
    message: "You're doing well. Keep up your healthy routines.",
  },
  Moderate: {
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
    bar: "bg-amber-500",
    ring: "ring-amber-200 dark:ring-amber-900",
    title: "text-amber-700 dark:text-amber-400",
    card: "bg-amber-50/50 dark:bg-amber-950/15",
    mfbi: "text-amber-700 dark:text-amber-400",
    message: "Some warning signs. Check the recommendations below.",
  },
  High: {
    badge: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
    bar: "bg-red-500",
    ring: "ring-red-300 dark:ring-red-800",
    title: "text-red-700 dark:text-red-400",
    card: "bg-red-50/80 dark:bg-red-950/25",
    mfbi: "font-semibold text-red-700 dark:text-red-400",
    message: "Your burnout risk is high. Please review the recommended actions.",
  },
  Severe: {
    badge: "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200",
    bar: "bg-red-600",
    ring: "ring-red-400 dark:ring-red-700",
    title: "text-red-800 dark:text-red-300",
    card: "bg-red-100/80 dark:bg-red-950/35",
    mfbi: "font-semibold text-red-800 dark:text-red-300",
    message:
      "Your burnout risk is severe. Consider reaching out to the guidance office.",
  },
};

const DEFAULT_RISK_THEME: RiskTheme = {
  badge: "bg-muted text-muted-foreground",
  bar: "bg-primary",
  ring: "ring-foreground/10",
  title: "text-foreground",
  card: "",
  mfbi: "text-foreground",
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
    <Card className={cn("ring-2", theme.ring, theme.card)}>
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
              <span
                className={cn(
                  "font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight",
                  theme.title
                )}
              >
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
            <span className={cn("font-medium tabular-nums", theme.mfbi)}>
              {mfbiScore != null
                ? `${mfbiScore.toFixed(2)} (${mfbiPercent}%)`
                : "—"}
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
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function factorTone(normalized: number) {
  return getRiskTheme(classifyMfbiScore(normalized)).bar;
}

function factorScoreLabel(
  prefix: string,
  normalized: number,
  level?: string | null
) {
  const score = formatNormalizedFactor(normalized);
  return level ? `${prefix}: ${score} · ${level}` : `${prefix}: ${score}`;
}

function FactorCard({
  icon,
  label,
  description,
  factor,
  rawLabel,
  primaryLabel,
  footnote = "Contribution to the burnout score — lower is better.",
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  factor: BurnoutFactor | null;
  rawLabel?: string;
  /** Overrides the primary percentage display (e.g. "Sleep Risk = 64%"). */
  primaryLabel?: string;
  footnote?: string;
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
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums">
                {primaryLabel ?? `${percent}%`}
              </span>
              {rawLabel ? (
                <span className="text-xs text-muted-foreground">{rawLabel}</span>
              ) : null}
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
            <p className="text-[11px] text-muted-foreground">{footnote}</p>
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
          label="Stress Level"
          description="How stressed the past week felt."
          factor={factors?.stress ?? null}
          rawLabel={
            factors
              ? factorScoreLabel(
                  "SL",
                  factors.stress.normalized,
                  stressLevel
                )
              : undefined
          }
        />
        <FactorCard
          icon={<BookOpenIcon />}
          label="Academic Workload"
          description="How heavy schoolwork feels."
          factor={factors?.workload ?? null}
          rawLabel={
            factors
              ? factorScoreLabel(
                  "AW",
                  factors.workload.normalized,
                  classifyMfbiScore(factors.workload.normalized)
                )
              : undefined
          }
        />
        <FactorCard
          icon={<ClockIcon />}
          label="Study Time"
          description="How heavy your study load feels."
          factor={factors?.studyTime ?? null}
          rawLabel={
            factors
              ? factorScoreLabel(
                  "ST",
                  factors.studyTime.normalized,
                  classifyMfbiScore(factors.studyTime.normalized)
                )
              : undefined
          }
        />
        <FactorCard
          icon={<MoonIcon />}
          label="Sleep Hours"
          description="How poor sleep contributed to burnout risk."
          factor={factors?.sleep ?? null}
          rawLabel={
            factors
              ? factorScoreLabel(
                  "Sleep",
                  factors.sleep.normalized,
                  classifyMfbiScore(factors.sleep.normalized)
                )
              : undefined
          }
          footnote="Higher means poorer sleep and greater burnout risk."
        />
      </div>
    </div>
  );
}
