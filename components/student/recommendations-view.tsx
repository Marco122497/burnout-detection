import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BurnoutLevel } from "@/lib/student/mfbi";
import type { FactorRecommendation } from "@/lib/student/tips";
import { getTipsForLevel } from "@/lib/student/tips";
import { cn } from "@/lib/utils";

function riskTone(level: string | null | undefined) {
  if (level === "High" || level === "Severe") {
    return "text-red-700 dark:text-red-400";
  }
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

export function RecommendationsView({
  burnoutLevel,
  guidance,
  factorRecommendations = [],
  recommendationBasis = null,
  recommendationTrend = null,
  currentLevel = null,
  nextWeekRisk = null,
  currentMfbi = null,
  previousMfbi = null,
}: {
  burnoutLevel: BurnoutLevel | null;
  guidance: {
    title: string;
    description: string;
    burnout_level: string;
    recommended_action?: string | null;
  } | null;
  factorRecommendations?: FactorRecommendation[];
  recommendationBasis?: "next_week" | "current" | null;
  recommendationTrend?: string | null;
  currentLevel?: BurnoutLevel | null;
  nextWeekRisk?: BurnoutLevel | null;
  currentMfbi?: number | null;
  previousMfbi?: number | null;
}) {
  const tips = factorRecommendations.length
    ? [...factorRecommendations]
        .sort((a, b) => b.normalized - a.normalized)
        .map((item) => ({
          category: item.category,
          title: item.title,
          tips: item.tips,
          level: item.level,
          action: item.recommended_action,
          description: item.description,
          normalized: item.normalized,
          factorTrend: item.factorTrend ?? null,
        }))
    : getTipsForLevel(burnoutLevel).map((item) => ({
        ...item,
        level: burnoutLevel,
        action: null as string | null,
        description: null as string | null,
        factorTrend: null as string | null,
      }));

  const highFactors = tips.filter(
    (tip) => tip.level === "High" || tip.level === "Severe"
  );

  const trendText = trendArrow(recommendationTrend);
  const outlookLabel =
    recommendationTrend === "decreasing"
      ? "From improving trend"
      : recommendationBasis === "next_week"
        ? "From next-week early warning"
        : "From your burnout score";

  return (
    <div className="space-y-6">
      {highFactors.length > 0 ? (
        <Card className="border-red-500/25 bg-red-50/60 dark:bg-red-950/25">
          <CardHeader>
            <CardTitle className="text-lg text-red-800 dark:text-red-300">
              Guidance referral recommended
            </CardTitle>
            <CardDescription>
              One or more burnout factors are high. Please seek the Guidance
              Office for counseling support.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              High factor
              {highFactors.length === 1 ? "" : "s"}:{" "}
              <span className="font-medium text-foreground">
                {highFactors.map((factor) => factor.category).join(", ")}
              </span>
              .
            </p>
            <p>
              Visit the Guidance Office for a guidance referral and counseling
              support. Your monitoring results are confidential and meant to help
              you get timely assistance.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Counseling recommendation</CardTitle>
          <CardDescription>
            Next-week early warning outlook, plus what to do this week for
            stress, schoolwork, study time, and sleep.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {guidance ? (
            <div className="space-y-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {outlookLabel}
                {burnoutLevel ? ` · ${burnoutLevel}` : ""}
              </p>
              <p className="text-lg font-medium">{guidance.title}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {guidance.description}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {currentMfbi != null ? (
                  <span>
                    MFBI:{" "}
                    <span className="font-medium text-foreground">
                      {Number(currentMfbi).toFixed(2)}
                    </span>
                    {previousMfbi != null ? (
                      <>
                        {" "}
                        (was {Number(previousMfbi).toFixed(2)})
                      </>
                    ) : null}
                  </span>
                ) : null}
                {trendText ? (
                  <span>
                    Trend:{" "}
                    <span className="font-medium text-foreground">
                      {trendText}
                    </span>
                  </span>
                ) : null}
                {currentLevel ? (
                  <span>
                    Current week:{" "}
                    <span className={cn("font-medium", riskTone(currentLevel))}>
                      {currentLevel}
                    </span>
                  </span>
                ) : null}
                {nextWeekRisk ? (
                  <span>
                    Next week:{" "}
                    <span className={cn("font-medium", riskTone(nextWeekRisk))}>
                      {nextWeekRisk}
                    </span>
                  </span>
                ) : null}
              </div>
              {guidance.recommended_action ? (
                <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-foreground">
                  <span className="font-medium">Action: </span>
                  {guidance.recommended_action}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete weekly monitoring to see your personalized counseling
              recommendation.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            What to do this week
          </h2>
          <p className="text-sm text-muted-foreground">
            Based on your latest monitoring scores for stress, schoolwork, study
            time, and sleep — compared with your previous week when available.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {tips.map((tip) => (
            <Card
              key={tip.category}
              className={
                tip.level === "High" || tip.level === "Severe"
                  ? "border-red-500/20"
                  : undefined
              }
            >
              <CardHeader>
                <CardDescription className="flex items-center justify-between gap-2">
                  <span className="uppercase tracking-wide">
                    {tip.category}
                  </span>
                  {tip.level ? (
                    <span
                      className={cn(
                        "shrink-0 text-right font-medium",
                        riskTone(tip.level)
                      )}
                    >
                      {tip.level}
                      {tip.factorTrend
                        ? ` · ${trendArrow(tip.factorTrend)}`
                        : ""}
                    </span>
                  ) : null}
                </CardDescription>
                <CardTitle className="text-lg">{tip.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tip.description ? (
                  <p className="text-sm text-muted-foreground">
                    {tip.description}
                  </p>
                ) : null}
                {tip.level === "High" || tip.level === "Severe" ? (
                  <p className="rounded-md border border-red-500/20 bg-red-50/80 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/40 dark:text-red-300">
                    Guidance referral: please seek the Guidance Office for
                    counseling support.
                  </p>
                ) : null}
                {tip.action ? (
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Action: </span>
                    {tip.action}
                  </p>
                ) : null}
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {tip.tips.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
