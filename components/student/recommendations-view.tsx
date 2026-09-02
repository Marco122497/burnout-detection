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

function trendLabel(trend: string | null | undefined) {
  if (!trend || trend === "insufficient_history") return null;
  return trend.replaceAll("_", " ");
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
          normalized: item.normalized,
        }))
    : getTipsForLevel(burnoutLevel).map((item) => ({
        ...item,
        level: burnoutLevel,
        action: null as string | null,
      }));

  const trendText = trendLabel(recommendationTrend);
  const basisLabel =
    recommendationTrend === "decreasing"
      ? `Based on your decreasing trend and current ${
          burnoutLevel ?? "risk"
        } warning${
          currentMfbi != null ? ` (MFBI ${Number(currentMfbi).toFixed(2)})` : ""
        }`
      : recommendationBasis === "next_week"
        ? `Based on your next-week early warning prediction${
            burnoutLevel ? ` (${burnoutLevel})` : ""
          }`
        : `Based on your current burnout score${
            burnoutLevel ? ` (${burnoutLevel})` : ""
          }`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>What you can do</CardTitle>
          <CardDescription>{basisLabel}.</CardDescription>
        </CardHeader>
        <CardContent>
          {guidance ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {currentLevel ? (
                  <>
                    Current week:{" "}
                    <span className={cn("font-medium", riskTone(currentLevel))}>
                      {currentLevel}
                    </span>
                  </>
                ) : null}
                {currentMfbi != null ? (
                  <>
                    {currentLevel ? " · " : null}
                    MFBI {Number(currentMfbi).toFixed(2)}
                  </>
                ) : null}
                {nextWeekRisk ? (
                  <>
                    {" "}
                    · Next week:{" "}
                    <span className={cn("font-medium", riskTone(nextWeekRisk))}>
                      {nextWeekRisk}
                    </span>
                  </>
                ) : null}
                {trendText ? (
                  <>
                    {" "}
                    · Trend:{" "}
                    <span className="font-medium text-foreground">
                      {trendText}
                    </span>
                  </>
                ) : null}
              </p>
              <p className="font-medium">{guidance.title}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {guidance.description}
              </p>
              {guidance.recommended_action ? (
                <p className="text-sm text-muted-foreground">
                  What to do: {guidance.recommended_action}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete weekly monitoring to see tips for you.
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
            Practical steps from your latest stress, schoolwork, study time, and
            sleep scores.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
        {tips.map((tip) => (
          <Card key={tip.category}>
            <CardHeader>
              <CardDescription className="flex items-center justify-between gap-2">
                <span>{tip.category}</span>
                {tip.level ? (
                  <span className={cn("font-medium", riskTone(tip.level))}>
                    {tip.level}
                  </span>
                ) : null}
              </CardDescription>
              <CardTitle className="text-lg">{tip.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tip.action ? (
                <p className="text-sm text-muted-foreground">{tip.action}</p>
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
