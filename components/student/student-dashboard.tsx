import Link from "next/link";
import {
  BookOpenIcon,
  BrainIcon,
  CheckCircle2Icon,
  ClockIcon,
  FlameIcon,
  HeartPulseIcon,
  LightbulbIcon,
  MegaphoneIcon,
  MoonIcon,
} from "lucide-react";

import type { Profile } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/auth/roles";
import type {
  BurnoutFactor,
  StudentDashboardData,
} from "@/lib/student/dashboard";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RiskTheme = {
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

const DEFAULT_THEME: RiskTheme = {
  badge: "bg-muted text-muted-foreground",
  bar: "bg-primary",
  ring: "ring-foreground/10",
  message: "Submit your weekly monitoring to see your burnout risk.",
};

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
              Contribution to your burnout score — lower is better.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function TrendBars({
  data,
}: {
  data: StudentDashboardData["weeklyTrend"];
}) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No burnout trend yet. Submit weekly monitoring to start tracking.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.score ?? 0), 0.01);

  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((point) => {
        const height = Math.max(((point.score ?? 0) / max) * 100, 8);
        return (
          <div
            key={`${point.week}-${point.score}`}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div
              className="w-full rounded-t-md bg-primary/80 transition-all"
              style={{ height: `${height}%` }}
              title={`Week ${point.week}: ${point.score?.toFixed(2) ?? "—"} (${point.level ?? "—"})`}
            />
            <span className="text-[10px] text-muted-foreground">
              W{point.week}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function StudentDashboard({
  profile,
  data,
}: {
  profile: Profile;
  data: StudentDashboardData;
}) {
  const theme = (data.burnoutLevel && RISK_THEMES[data.burnoutLevel]) || DEFAULT_THEME;
  const mfbiPercent =
    data.mfbiScore != null ? Math.round(data.mfbiScore * 100) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Welcome, {profile.first_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your burnout risk and weekly monitoring status.
        </p>
      </div>

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
                Your current burnout risk
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
                  {data.burnoutLevel ?? "No data"}
                </span>
                {data.latestWeek != null ? (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      theme.badge
                    )}
                  >
                    Week {data.latestWeek}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {theme.message}
              </p>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">
                Burnout index (MFBI)
              </span>
              <span className="font-medium tabular-nums">
                {data.mfbiScore != null ? data.mfbiScore.toFixed(2) : "—"}
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
            {data.monitoringStatus === "Pending" ? (
              <Link
                href="/student/monitoring"
                className={cn(buttonVariants({ size: "sm" }), "mt-1 w-full")}
              >
                <HeartPulseIcon />
                Complete Week {data.currentWeek ?? "—"} monitoring
              </Link>
            ) : (
              <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                {data.monitoringStatus === "Submitted"
                  ? `Week ${data.currentWeek ?? "—"} monitoring submitted`
                  : `Week ${data.currentWeek ?? "—"} monitoring is closed`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          What makes up your burnout score
        </h2>
        <p className="text-sm text-muted-foreground">
          Your burnout index combines these four factors from your latest
          weekly monitoring.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FactorCard
            icon={<BrainIcon />}
            label="Perceived Stress"
            description="How stressed you've felt (PSS)."
            factor={data.factors?.stress ?? null}
            rawLabel={
              data.factors
                ? `PSS: ${data.factors.stress.raw}/40${data.stressLevel ? ` · ${data.stressLevel}` : ""}`
                : undefined
            }
          />
          <FactorCard
            icon={<BookOpenIcon />}
            label="Academic Workload"
            description="How heavy your schoolwork feels."
            factor={data.factors?.workload ?? null}
          />
          <FactorCard
            icon={<ClockIcon />}
            label="Study Time"
            description="Time spent studying each day."
            factor={data.factors?.studyTime ?? null}
          />
          <FactorCard
            icon={<MoonIcon />}
            label="Sleep Hours"
            description="Your sleeping patterns and duration."
            factor={data.factors?.sleep ?? null}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Burnout risk trend</CardTitle>
            <CardDescription>
              Recent weekly MFBI scores from assessment history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendBars data={data.weeklyTrend} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LightbulbIcon className="size-4" />
              Counseling recommendation
            </CardTitle>
            <CardDescription>
              Guidance tip matched to your current risk level.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recommendation ? (
              <>
                <p className="text-sm font-medium">{data.recommendation.title}</p>
                <p className="text-sm text-muted-foreground">
                  {data.recommendation.description}
                </p>
                {data.recommendation.recommended_action ? (
                  <p className="text-sm text-muted-foreground">
                    Action: {data.recommendation.recommended_action}
                  </p>
                ) : null}
                <Link
                  href="/student/recommendations"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  View recommendations
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Recommendations appear after your first assessment result.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MegaphoneIcon className="size-4" />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.announcements.length ? (
            data.announcements.map((item) => (
              <div
                key={item.announcement_id}
                className="border-b border-border/70 pb-3 last:border-0 last:pb-0"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {item.content}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(item.created_at)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
