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

function rewriteForNextWeek(text: string, nextWeekScore: number | null) {
  const nextWeek = text.replace(/\bthis week's\b|\bthis week\b/gi, (match) => {
    const week = match.toLowerCase().endsWith("'s") ? "week's" : "week";
    return `${match[0] === "T" ? "Next" : "next"} ${week}`;
  });
  if (nextWeekScore == null || !Number.isFinite(Number(nextWeekScore))) {
    return nextWeek;
  }
  const predicted = Number(nextWeekScore).toFixed(2);
  return nextWeek
    .replace(/\(MFBI\s*\d+\.\d+\)/gi, `(predicted ${predicted})`)
    .replace(/\bMFBI\s+\d+\.\d+/gi, `predicted ${predicted}`);
}

export function RagRecommendationPanel({
  recommendation,
  compact = false,
  nextWeekRisk = null,
  nextWeekScore = null,
}: {
  recommendation: StoredRagRecommendation;
  compact?: boolean;
  nextWeekRisk?: string | null;
  nextWeekScore?: number | null;
}) {
  const actions = compact
    ? recommendation.recommended_actions.slice(0, 4)
    : recommendation.recommended_actions;
  const factors = compact
    ? recommendation.contributing_factors.slice(0, 4)
    : recommendation.contributing_factors;
  const shownRisk = nextWeekRisk ?? recommendation.risk_level;
  const shownScore =
    nextWeekScore != null ? nextWeekScore : recommendation.mfbi_score;
  const forNextWeek = nextWeekRisk != null || nextWeekScore != null;
  const summary = forNextWeek
    ? rewriteForNextWeek(recommendation.assessment_summary, nextWeekScore)
    : recommendation.assessment_summary;
  const shownFactors = forNextWeek
    ? factors.map((factor) => rewriteForNextWeek(factor, nextWeekScore))
    : factors;
  const shownActions = forNextWeek
    ? actions.map((action) => rewriteForNextWeek(action, nextWeekScore))
    : actions;
  const support = forNextWeek
    ? rewriteForNextWeek(recommendation.human_support, nextWeekScore)
    : recommendation.human_support;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {forNextWeek ? "Next week burnout risk (AI)" : "Burnout risk"}
          </p>
          <p
            className={cn(
              "text-xl font-semibold tracking-tight",
              riskTone(shownRisk)
            )}
          >
            {shownRisk
              ? `${shownRisk} risk`
              : "Risk available after monitoring"}
          </p>
        </div>
        {shownScore != null ? (
          <p className="text-sm text-muted-foreground">
            {forNextWeek ? "Next week prediction: " : "MFBI score: "}
            <span className="font-medium text-foreground">
              {Number(shownScore).toFixed(2)}
            </span>
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {forNextWeek ? "How next week looks" : "How this week looks"}
        </p>
        <p className="text-sm text-foreground whitespace-pre-line">
          {summary}
        </p>
      </div>

      {shownFactors.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {forNextWeek
              ? "What may weigh on you next week"
              : "What's weighing on you"}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {shownFactors.map((factor) => (
              <li key={factor}>{factor}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {shownActions.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {forNextWeek
              ? "Things you can try next week"
              : "Things you can try this week"}
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
            {shownActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {support ? (
        <div className="space-y-1 rounded-lg border bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Someone you can talk to
          </p>
          <p className="text-sm text-foreground whitespace-pre-line">
            {support}
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
  nextWeekRisk = null,
  nextWeekScore = null,
}: {
  recommendation: StoredRagRecommendation;
  compact?: boolean;
  nextWeekRisk?: string | null;
  nextWeekScore?: number | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {nextWeekRisk || nextWeekScore != null
            ? "Advice for next week"
            : "Advice for this week"}
        </CardTitle>
        <CardDescription>
          {nextWeekRisk || nextWeekScore != null
            ? "A plain-language look at next week's predicted burnout risk, based on your latest form and school well-being guidance."
            : "A plain-language look at this week, based on your scores and school well-being guidance."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RagRecommendationPanel
          recommendation={recommendation}
          compact={compact}
          nextWeekRisk={nextWeekRisk}
          nextWeekScore={nextWeekScore}
        />
      </CardContent>
    </Card>
  );
}
