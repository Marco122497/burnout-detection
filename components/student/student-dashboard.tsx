"use client";

import Link from "next/link";
import {
  CheckCircle2Icon,
  HeartPulseIcon,
  LightbulbIcon,
  MegaphoneIcon,
} from "lucide-react";

import type { Profile } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/auth/roles";
import type { StudentDashboardData } from "@/lib/student/dashboard";
import { formatFactorRiskLabel } from "@/lib/student/tips";
import {
  BurnoutFactorSection,
  BurnoutHero,
} from "@/components/shared/burnout-summary";
import {
  BurnoutRiskTrendChart,
  EarlyWarningOutlookCard,
} from "@/components/shared/burnout-outlook";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function riskTone(level: string | null | undefined) {
  if (level === "High" || level === "Severe") return "text-red-700 dark:text-red-400";
  if (level === "Moderate") return "text-amber-700 dark:text-amber-400";
  if (level === "Low") return "text-emerald-700 dark:text-emerald-400";
  return "text-muted-foreground";
}

function trendArrow(trend: string | null | undefined) {
  if (trend === "increasing") return "↑ Increasing";
  if (trend === "decreasing") return "↓ Decreasing";
  if (trend === "stable") return "→ Stable";
  return null;
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
      <div className="space-y-2">
        <p className="student-chum-pill w-fit">Student dashboard</p>
        <h1 className="text-3xl font-bold tracking-tight text-[color:var(--chum-ink)] sm:text-4xl">
          Welcome,{" "}
          <span className="student-chum-marker">{profile.first_name}</span>
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Track your burnout risk, finish weekly monitoring, and follow
          counseling tips — all in one place.
        </p>
      </div>

      <BurnoutHero
        level={data.burnoutLevel}
        mfbiScore={data.mfbiScore}
        weekLabel={data.latestWeek != null ? `Week ${data.latestWeek}` : null}
      >
        <div className="space-y-1 pt-1 text-xs text-muted-foreground">
          {data.decisionTreePrediction != null ||
          data.randomForestPrediction != null ? (
            <p>
              DT: {data.decisionTreePrediction ?? "—"}
              {data.decisionTreeConfidence != null
                ? ` (${data.decisionTreeConfidence}%)`
                : ""}
              {data.selectedModel === "Decision Tree" ? " · selected" : ""}{" "}
              RF: {data.randomForestPrediction ?? "—"}
              {data.randomForestConfidence != null
                ? ` (${data.randomForestConfidence}%)`
                : ""}
              {data.selectedModel === "Random Forest" ? " · selected" : ""}
            </p>
          ) : data.modelConfidence != null ? (
            <p>
              Prediction confidence: {data.modelConfidence}%
              {data.selectedModel === "Decision Tree"
                ? " · DT"
                : data.selectedModel === "Random Forest"
                  ? " · RF"
                  : data.selectedModel
                    ? ` · ${data.selectedModel}`
                    : ""}
            </p>
          ) : null}
          {data.predictionDate ? (
            <p>Submitted: {formatDateTime(data.predictionDate)}</p>
          ) : null}
        </div>
        {data.monitoringStatus === "Pending" ? (
          <Link
            href="/student/monitoring"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-2 w-full rounded-full px-5 font-bold"
            )}
          >
            <HeartPulseIcon />
            Complete Week {data.currentWeek ?? "—"} monitoring →
          </Link>
        ) : (
          <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <CheckCircle2Icon className="size-3.5 text-[color:var(--chum-green-deep)]" />
            {data.monitoringStatus === "Submitted"
              ? `Week ${data.currentWeek ?? "—"} monitoring submitted`
              : `Week ${data.currentWeek ?? "—"} monitoring is closed`}
          </p>
        )}
      </BurnoutHero>

      <BurnoutFactorSection
        factors={data.factors}
        stressLevel={data.stressLevel}
        heading="What makes up your burnout score"
        subheading="Your burnout index combines these four factors from your latest weekly monitoring."
      />

      <EarlyWarningOutlookCard
        earlyWarning={data.earlyWarning}
        mfbiScore={data.mfbiScore}
        burnoutLevel={data.burnoutLevel}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <BurnoutRiskTrendChart
          className="lg:col-span-3"
          data={data.weeklyTrend}
          earlyWarning={data.earlyWarning}
          emptyMessage="No burnout trend yet. Submit weekly monitoring to start tracking."
        />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LightbulbIcon className="size-4" />
              Counseling Recommendation
            </CardTitle>
            <CardDescription>
              Next-week early warning outlook, plus what to do this week for
              stress, schoolwork, study time, and sleep.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recommendation ? (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {data.recommendation.trend === "decreasing"
                      ? "From improving trend"
                      : data.recommendation.trend === "increasing"
                        ? "From next-week early warning · rising"
                        : data.recommendation.basis === "next_week"
                          ? "From next-week early warning"
                          : "From your burnout score"}
                    {data.recommendation.burnout_level
                      ? ` · ${data.recommendation.burnout_level}`
                      : ""}
                  </p>
                  <p className="text-base font-medium leading-snug">
                    {data.recommendation.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.recommendation.description}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {data.recommendation.currentMfbi != null ? (
                      <span>
                        MFBI:{" "}
                        <span className="font-medium text-foreground">
                          {Number(data.recommendation.currentMfbi).toFixed(2)}
                        </span>
                        {data.recommendation.previousMfbi != null ? (
                          <>
                            {" "}
                            (was{" "}
                            {Number(data.recommendation.previousMfbi).toFixed(2)}
                            )
                          </>
                        ) : null}
                      </span>
                    ) : null}
                    {trendArrow(data.recommendation.trend) ? (
                      <span>
                        Trend:{" "}
                        <span className="font-medium text-foreground">
                          {trendArrow(data.recommendation.trend)}
                        </span>
                      </span>
                    ) : null}
                    {data.recommendation.nextWeekRisk ? (
                      <span>
                        Next week:{" "}
                        <span
                          className={cn(
                            "font-medium",
                            riskTone(data.recommendation.nextWeekRisk)
                          )}
                        >
                          {data.recommendation.nextWeekRisk}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  {data.recommendation.recommended_action ? (
                    <p className="student-chum-tip px-3 py-2.5 text-sm">
                      <span className="font-bold">Action: </span>
                      {data.recommendation.recommended_action}
                    </p>
                  ) : null}
                </div>

                {data.factorRecommendations.length ? (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      What to do this week
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on your latest monitoring scores for stress,
                      schoolwork, study time, and sleep.
                    </p>
                    <ul className="space-y-2">
                      {data.factorRecommendations.map((item) => (
                        <li
                          key={item.key}
                          className="student-chum-choice rounded-2xl px-3.5 py-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                {item.category}
                              </p>
                              <p className="text-sm font-medium leading-snug">
                                {item.title}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                              <span
                                className={cn(
                                  "text-[11px] font-medium",
                                  riskTone(item.level)
                                )}
                              >
                                {formatFactorRiskLabel(item.level)}
                                {item.factorTrend
                                  ? ` · ${trendArrow(item.factorTrend)}`
                                  : ""}
                              </span>
                            </div>
                          </div>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              Action:{" "}
                            </span>
                            {item.recommended_action}
                          </p>
                          {item.tips.length ? (
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                              {item.tips
                                .filter(
                                  (tip) =>
                                    !/guidance office for counseling support/i.test(
                                      tip
                                    )
                                )
                                .slice(0, 3)
                                .map((tip) => (
                                  <li key={tip}>{tip}</li>
                                ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <Link
                  href="/student/recommendations"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "rounded-full px-4 font-bold"
                  )}
                >
                  View full counseling recommendation →
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your personalized counseling recommendation appears after you
                submit weekly monitoring.
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
