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

/** Bands match classifyMfbiScore: Low < 40%, Moderate 40–69%, High ≥ 70%. */
const MFBI_BAND_EDGES = [40, 70] as const;

const MFBI_BANDS = [
  { label: "Low", from: 0, to: 39, span: 40 },
  { label: "Moderate", from: 40, to: 69, span: 30 },
  { label: "High", from: 70, to: 100, span: 30 },
] as const;

const MFBI_RULER_TICKS = Array.from({ length: 21 }, (_, i) => i * 5);

/** Same Low / Moderate / High colors as the Guidance and Instructor charts. */
const MFBI_COLOR_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, "oklch(0.72 0.15 160)"],
  [20, "oklch(0.72 0.15 160)"],
  [40, "oklch(0.8 0.15 85)"],
  [55, "oklch(0.8 0.15 85)"],
  [70, "oklch(0.68 0.19 40)"],
  [100, "oklch(0.58 0.21 30)"],
];

const MFBI_GRADIENT = `linear-gradient(to right, ${MFBI_COLOR_STOPS.map(
  ([at, color]) => `${color} ${at}%`
).join(", ")})`;

function mfbiColorAt(percent: number): string {
  const p = Math.min(Math.max(percent, 0), 100);
  for (let i = 1; i < MFBI_COLOR_STOPS.length; i++) {
    const [endAt, endColor] = MFBI_COLOR_STOPS[i];
    if (p > endAt) continue;
    const [startAt, startColor] = MFBI_COLOR_STOPS[i - 1];
    const t = endAt === startAt ? 0 : (p - startAt) / (endAt - startAt);
    return `color-mix(in oklch, ${endColor} ${Math.round(t * 100)}%, ${startColor})`;
  }
  return MFBI_COLOR_STOPS[MFBI_COLOR_STOPS.length - 1][1];
}

export function BurnoutHero({
  level,
  mfbiScore,
  weekLabel,
  description,
  title = "Current burnout risk",
  scoreLabel = "Burnout index (MFBI)",
  children,
}: {
  level: string | null;
  mfbiScore: number | null;
  weekLabel?: string | null;
  /** Overrides the default student-facing message. */
  description?: string | null;
  /** Left-column eyebrow, e.g. "Current burnout risk". */
  title?: string;
  /** Right-column score label, e.g. "Burnout index (MFBI)". */
  scoreLabel?: string;
  /** Rendered under the MFBI bar (e.g. CTA button or status text). */
  children?: React.ReactNode;
}) {
  const theme = getRiskTheme(level);
  const mfbiNumber = mfbiScore != null ? Number(mfbiScore) : null;
  const mfbiPercent =
    mfbiNumber != null && Number.isFinite(mfbiNumber)
      ? Math.round(mfbiNumber * 100)
      : null;

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
            <p className="text-sm text-muted-foreground">{title}</p>
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

        <div className="w-full space-y-2 lg:w-1/2 lg:shrink-0">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">{scoreLabel}</span>
            <span className={cn("font-medium tabular-nums", theme.mfbi)}>
              {mfbiNumber != null && Number.isFinite(mfbiNumber)
                ? `${mfbiNumber.toFixed(2)} (${mfbiPercent}%)`
                : "—"}
            </span>
          </div>
          <div className="pt-1">
            <div aria-hidden className="relative h-7">
              {MFBI_RULER_TICKS.map((tick) => {
                const major = tick % 10 === 0;
                const edge = (MFBI_BAND_EDGES as readonly number[]).includes(
                  tick
                );
                return (
                  <span
                    key={tick}
                    className="absolute bottom-0"
                    style={{ left: `${tick}%` }}
                  >
                    {major ? (
                      <span
                        className={cn(
                          "absolute -translate-x-1/2 leading-none tabular-nums",
                          edge
                            ? "bottom-3.5 text-xs font-bold text-foreground"
                            : "bottom-2.5 text-[10px] text-muted-foreground"
                        )}
                      >
                        {tick}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "absolute bottom-0 w-px -translate-x-1/2 rounded-full",
                        edge
                          ? "h-3 w-0.5 bg-foreground/70"
                          : major
                            ? "h-1.5 bg-muted-foreground/60"
                            : "h-1 bg-border"
                      )}
                    />
                  </span>
                );
              })}
            </div>
            <div className="relative mt-1 py-0.5">
              <div
                className="h-2.5 w-full rounded-full"
                style={{ background: MFBI_GRADIENT }}
              />
              {MFBI_BAND_EDGES.map((edge) => (
                <span
                  key={edge}
                  aria-hidden
                  className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70"
                  style={{ left: `${edge}%` }}
                />
              ))}
              {mfbiPercent != null ? (
                <span
                  aria-hidden
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm ring-1 ring-foreground/15 transition-all"
                  style={{
                    left: `${Math.min(Math.max(mfbiPercent, 0), 100)}%`,
                    backgroundColor: mfbiColorAt(mfbiPercent),
                  }}
                />
              ) : null}
            </div>
            <div
              className="mt-2.5 grid gap-1"
              style={{
                gridTemplateColumns: MFBI_BANDS.map(
                  (band) => `${band.span}fr`
                ).join(" "),
              }}
            >
              {MFBI_BANDS.map((band) => {
                const active =
                  mfbiPercent != null &&
                  classifyMfbiScore(mfbiPercent / 100) === band.label;
                return (
                  <span
                    key={band.label}
                    className={cn(
                      "flex flex-col items-center text-center text-[10px] leading-tight whitespace-nowrap transition-opacity",
                      getRiskTheme(band.label).title,
                      active ? "font-semibold" : "font-medium opacity-60"
                    )}
                  >
                    {band.label}
                    <span className="tabular-nums text-muted-foreground">
                      {band.from}–{band.to}
                    </span>
                  </span>
                );
              })}
            </div>
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
  const full = percent === 100;

  return (
    <Card
      size="sm"
      className={
        full ? "border-red-500/40 bg-red-50/50 dark:bg-red-950/20" : undefined
      }
    >
      <CardHeader className="gap-1">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
          <CardTitle className="text-sm">{label}</CardTitle>
          {full ? (
            <span className="ml-auto rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
              100%
            </span>
          ) : null}
        </div>
        <CardDescription className="student-chum-prose text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {factor ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={cn(
                  "font-[family-name:var(--font-plus-jakarta)] text-xl font-semibold tabular-nums",
                  full && "text-red-700 dark:text-red-400"
                )}
              >
                {primaryLabel ?? `${percent}%`}
              </span>
              {rawLabel ? (
                <span
                  className={cn(
                    "student-chum-prose text-xs text-muted-foreground",
                    full && "font-semibold text-red-800 dark:text-red-300"
                  )}
                >
                  {rawLabel}
                </span>
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
            <p className="student-chum-prose text-[11px] text-muted-foreground">
              {footnote}
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
      <p className="student-chum-prose text-sm text-muted-foreground">{subheading}</p>
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
