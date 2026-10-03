import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { classifyMfbiScore } from "@/lib/student/mfbi";
import type { StudentFactors } from "@/lib/student/tips";
import {
  stripQuestionnaireItemLabel,
  type StoredRagRecommendation,
} from "@/lib/student/rag";
import { cn } from "@/lib/utils";

function riskTone(level: string | null | undefined) {
  if (level === "High" || level === "Severe") {
    return "text-red-700 dark:text-red-400";
  }
  if (level === "Moderate") return "text-amber-700 dark:text-amber-400";
  if (level === "Low") return "text-emerald-700 dark:text-emerald-400";
  return "text-muted-foreground";
}

function outlookLead(
  currentScore: number,
  nextScore: number,
  nextRisk: string | null
) {
  const current = Number(currentScore).toFixed(2);
  const next = Number(nextScore).toFixed(2);
  const delta = Number(next) - Number(current);
  const currentBand = classifyMfbiScore(Number(currentScore)).toLowerCase();
  const nextBand = (nextRisk ?? classifyMfbiScore(Number(nextScore))).toLowerCase();

  if (Math.abs(delta) < 0.02) {
    return `Next week stays about the same as this week (${current}) and is still ${nextBand}.`;
  }
  if (currentBand === nextBand && delta < 0) {
    return `Next week is a bit lower than this week, from ${current} to ${next}, but it is still ${nextBand}.`;
  }
  if (currentBand === nextBand && delta > 0) {
    return `Next week is a bit higher than this week, from ${current} to ${next}, but it is still ${nextBand}.`;
  }
  if (delta < 0) {
    return `Next week is lower than this week, from ${currentBand} ${current} to ${nextBand} ${next}.`;
  }
  return `Next week is higher than this week, from ${currentBand} ${current} to ${nextBand} ${next}.`;
}

function prioritySentence(factors: StudentFactors) {
  const items = [
    { name: "sleep", score: factors.sleep.normalized },
    { name: "academic workload", score: factors.workload.normalized },
    { name: "stress", score: factors.stress.normalized },
    { name: "study time", score: factors.studyTime.normalized },
  ]
    .map((item) => ({
      ...item,
      level: classifyMfbiScore(item.score).toLowerCase(),
    }))
    .sort((a, b) => b.score - a.score);

  const focus = items.filter((item) => item.level !== "low");
  const okay = items.filter((item) => item.level === "low");
  const labeled = (item: (typeof items)[number]) =>
    `${item.name} (${item.score.toFixed(2)}, ${item.level})`;

  let sentence = "";
  if (focus.length === 1) {
    sentence = `Prioritize ${labeled(focus[0])}.`;
  } else if (focus.length > 1) {
    const [first, ...rest] = focus;
    sentence = `Prioritize ${labeled(first)} first, then ${rest.map(labeled).join(", then ")}.`;
  }

  if (okay.length) {
    const names = okay
      .map((item) => `${item.name} (${item.score.toFixed(2)})`)
      .join(" and ");
    const note = `${names} ${okay.length === 1 ? "is" : "are"} low, so ${okay.length === 1 ? "it does" : "they do"} not need to come first.`;
    sentence = sentence ? `${sentence} ${note}` : note;
  }

  return sentence;
}

const OLD_OUTLOOK_LEAD =
  /^Next week looks (?:okay|a bit heavy|quite hard to carry|very hard to carry) \(predicted \d+(?:\.\d+)?\)\.\s*/i;

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
    .replace(/\bMFBI\s+\d+\.\d+/gi, `predicted ${predicted}`)
    .replace(/\(predicted\s+\d+(?:\.\d+)?\)/gi, `(predicted ${predicted})`)
    .replace(/\bpredicted\s+\d+(?:\.\d+)?/gi, `predicted ${predicted}`);
}

export function RagRecommendationPanel({
  recommendation,
  compact = false,
  nextWeekRisk = null,
  nextWeekScore = null,
  factors = null,
}: {
  recommendation: StoredRagRecommendation;
  compact?: boolean;
  nextWeekRisk?: string | null;
  nextWeekScore?: number | null;
  factors?: StudentFactors | null;
}) {
  const actions = (compact
    ? recommendation.recommended_actions.slice(0, 4)
    : recommendation.recommended_actions
  ).map(stripQuestionnaireItemLabel);
  const factorLines = (compact
    ? recommendation.contributing_factors.slice(0, 4)
    : recommendation.contributing_factors
  ).map(stripQuestionnaireItemLabel);
  const shownRisk = nextWeekRisk ?? recommendation.risk_level;
  const shownScore =
    nextWeekScore != null ? nextWeekScore : recommendation.mfbi_score;
  const forNextWeek = nextWeekRisk != null || nextWeekScore != null;
  const currentScore = recommendation.mfbi_score;
  const priorities = factors ? prioritySentence(factors) : "";
  const comparison =
    forNextWeek &&
    nextWeekScore != null &&
    currentScore != null &&
    Number.isFinite(Number(currentScore)) &&
    Number.isFinite(Number(nextWeekScore))
      ? outlookLead(Number(currentScore), Number(nextWeekScore), shownRisk)
      : null;
  const summary = forNextWeek
    ? rewriteForNextWeek(recommendation.assessment_summary, nextWeekScore).replace(
        OLD_OUTLOOK_LEAD,
        ""
      )
    : recommendation.assessment_summary;
  const shownFactors = forNextWeek
    ? factorLines.map((factor) => rewriteForNextWeek(factor, nextWeekScore))
    : factorLines;
  const shownActions = forNextWeek
    ? actions.map((action) => rewriteForNextWeek(action, nextWeekScore))
    : actions;
  const support = forNextWeek
    ? rewriteForNextWeek(recommendation.human_support, nextWeekScore)
    : recommendation.human_support;

  return (
    <div className="student-chum-prose space-y-4">
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
          {comparison ? (
            <span className="font-medium text-foreground">{comparison} </span>
          ) : null}
          {priorities ? (
            <span className="font-medium text-foreground">{priorities} </span>
          ) : null}
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
