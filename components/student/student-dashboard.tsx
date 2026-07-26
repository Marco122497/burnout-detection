import Link from "next/link";
import {
  HeartPulseIcon,
  HistoryIcon,
  LightbulbIcon,
  MegaphoneIcon,
} from "lucide-react";

import type { Profile } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/auth/roles";
import type { StudentDashboardData } from "@/lib/student/dashboard";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function riskTone(level: string | null) {
  switch (level) {
    case "Low":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Moderate":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "High":
    case "Severe":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <Card className={cn("border", tone)}>
      <CardHeader className="pb-2">
        <CardDescription className="text-current/70">{label}</CardDescription>
        <CardTitle className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-xs text-current/70">{hint}</p>
        </CardContent>
      ) : null}
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
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Welcome, {profile.first_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your burnout risk and weekly monitoring status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/student/monitoring"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <HeartPulseIcon />
            Weekly monitoring
          </Link>
          <Link
            href="/student/burnout"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <HistoryIcon />
            Assessment history
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current burnout risk status"
          value={data.burnoutLevel ?? "No data"}
          hint="From latest MFBI + ML prediction"
          tone={riskTone(data.burnoutLevel)}
        />
        <StatCard
          label="Latest MFBI score"
          value={data.mfbiScore != null ? data.mfbiScore.toFixed(2) : "—"}
          hint="Multi-Factor Burnout Index"
        />
        <StatCard
          label="Burnout risk level"
          value={data.burnoutLevel ?? "No data"}
          hint={
            data.stressScore != null
              ? `Latest PSS score: ${data.stressScore} (${data.stressLevel})`
              : "Complete weekly monitoring"
          }
          tone={riskTone(data.burnoutLevel)}
        />
        <StatCard
          label="Weekly monitoring status"
          value={data.monitoringStatus}
          hint={
            data.monitoringStatus === "Submitted"
              ? `Week ${data.currentWeek ?? "—"} submitted`
              : data.monitoringStatus === "Closed"
                ? `Week ${data.currentWeek ?? "—"} closed by Guidance`
                : `Week ${data.currentWeek ?? "—"} open for submission`
          }
          tone={
            data.monitoringStatus === "Submitted"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : data.monitoringStatus === "Closed"
                ? "border-border bg-muted/40 text-muted-foreground"
                : "border-amber-200 bg-amber-50 text-amber-900"
          }
        />
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
