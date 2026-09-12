import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StoredRagRecommendation } from "@/lib/student/rag";
import { cn } from "@/lib/utils";

function riskTone(level: string | null | undefined) {
  if (level === "High" || level === "Severe") {
    return "text-red-700 dark:text-red-400";
  }
  if (level === "Moderate") return "text-amber-700 dark:text-amber-400";
  if (level === "Low") return "text-emerald-700 dark:text-emerald-400";
  return "text-muted-foreground";
}

export function RagRecommendationPanel({
  recommendation,
  compact = false,
}: {
  recommendation: StoredRagRecommendation;
  compact?: boolean;
}) {
  const actions = compact
    ? recommendation.recommended_actions.slice(0, 4)
    : recommendation.recommended_actions;
  const factors = compact
    ? recommendation.contributing_factors.slice(0, 4)
    : recommendation.contributing_factors;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Burnout risk
          </p>
          <p
            className={cn(
              "text-xl font-semibold tracking-tight",
              riskTone(recommendation.risk_level)
            )}
          >
            {recommendation.risk_level
              ? `${recommendation.risk_level} risk`
              : "Risk available after monitoring"}
          </p>
        </div>
        {recommendation.mfbi_score != null ? (
          <p className="text-sm text-muted-foreground">
            MFBI score:{" "}
            <span className="font-medium text-foreground">
              {Number(recommendation.mfbi_score).toFixed(2)}
            </span>
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          How this week looks
        </p>
        <p className="text-sm text-foreground whitespace-pre-line">
          {recommendation.assessment_summary}
        </p>
        {recommendation.used_fallback && recommendation.sources.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Retrieved knowledge was unavailable, so this uses general study-rest advice.
          </p>
        ) : null}
      </div>

      {factors.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            What's weighing on you
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {factors.map((factor) => (
              <li key={factor}>{factor}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {actions.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Things you can try this week
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
            {actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {recommendation.human_support ? (
        <div className="space-y-1 rounded-lg border bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Someone you can talk to
          </p>
          <p className="text-sm text-foreground whitespace-pre-line">
            {recommendation.human_support}
          </p>
        </div>
      ) : null}

      {!compact && recommendation.sources.length ? (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Where this advice comes from
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {recommendation.sources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function RagRecommendationCard({
  recommendation,
  compact = false,
}: {
  recommendation: StoredRagRecommendation;
  compact?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Advice for this week</CardTitle>
        <CardDescription>
          A plain-language look at this week, based on your scores and school
          well-being guidance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RagRecommendationPanel
          recommendation={recommendation}
          compact={compact}
        />
      </CardContent>
    </Card>
  );
}
