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

export function StudentDashboard({
  profile,
  data,
}: {
  profile: Profile;
  data: StudentDashboardData;
}) {
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
            <p>Predicted: {formatDateTime(data.predictionDate)}</p>
          ) : null}
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
              Counseling recommendation
            </CardTitle>
            <CardDescription>
              Tips aligned with your next-week early warning outlook when
              available, plus stress, schoolwork, study time, and sleep.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recommendation ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {data.recommendation.trend === "decreasing"
                    ? "From decreasing trend · current warning"
                    : data.recommendation.basis === "next_week"
                      ? "From next-week early warning"
                      : "From your burnout score"}
                  {data.recommendation.burnout_level
                    ? ` · ${data.recommendation.burnout_level}`
                    : ""}
                </p>
                <p className="text-sm font-medium">{data.recommendation.title}</p>
                <p className="text-sm text-muted-foreground">
                  {data.recommendation.description}
                </p>
                {data.recommendation.recommended_action ? (
                  <p className="text-sm text-muted-foreground">
                    Action: {data.recommendation.recommended_action}
                  </p>
                ) : null}
                {data.factorRecommendations.length ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Tips for your four scores
                    </p>
                    <ul className="space-y-2">
                      {data.factorRecommendations.map((item) => (
                        <li
                          key={item.key}
                          className="rounded-lg border border-border/70 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{item.title}</p>
                            <span
                              className={cn(
                                "shrink-0 text-[11px] font-medium",
                                riskTone(item.level)
                              )}
                            >
                              {item.level}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.category}: {item.recommended_action}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
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
                Tips appear after you submit weekly monitoring.
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
