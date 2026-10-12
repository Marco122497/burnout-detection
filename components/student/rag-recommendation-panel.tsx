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

function predictionLine(nextScore: number, nextRisk: string | null) {
  const nextBand = (nextRisk ?? classifyMfbiScore(nextScore)).toLowerCase();
  return `Next week prediction: ${Number(nextScore).toFixed(2)}, ${nextBand}. This is a forecast only and does not change the advice below.`;
}

type AdviceFactorKey = "stress" | "workload" | "sleep" | "study";

type AdviceFactor = {
  key: AdviceFactorKey;
  name: string;
  score: number;
  level: string;
};

const FACTOR_MARKERS: Record<AdviceFactorKey, RegExp[]> = {
  stress: [
    /unexpected problem/i,
    /nervous/i,
    /worry/i,
    /slow breath/i,
    /in control/i,
    /\bstress\b/i,
  ],
  workload: [/workload/i, /quizzes/i, /due date/i, /soonest/i, /deadlines/i, /classwork/i],
  sleep: [/sleep/i, /bedtime/i, /rested/i, /short nights/i, /coffee/i],
  study: [
    /studying/i,
    /study time/i,
    /40 to 50/i,
    /rereading/i,
    /study hours/i,
    /study block/i,
    /last study/i,
  ],
};

function adviceFactors(factors: StudentFactors): AdviceFactor[] {
  const items: AdviceFactor[] = [
    { key: "sleep", name: "sleep", score: Number(factors.sleep.normalized), level: "" },
    {
      key: "workload",
      name: "academic workload",
      score: Number(factors.workload.normalized),
      level: "",
    },
    { key: "stress", name: "stress", score: Number(factors.stress.normalized), level: "" },
    {
      key: "study",
      name: "study time",
      score: Number(factors.studyTime.normalized),
      level: "",
    },
  ];
  return items
    .map((item) => ({
      ...item,
      level: classifyMfbiScore(item.score).toLowerCase(),
    }))
    .sort((a, b) => b.score - a.score);
}

const GENERAL_WORKLOAD_TIP =
  "Write your schoolwork on one page with due dates, then circle what is due first.";

const DEFAULT_TIPS: Record<AdviceFactorKey, string> = {
  workload: GENERAL_WORKLOAD_TIP,
  sleep:
    "Keep a bedtime that gives you enough sleep, even if one homework is not done.",
  study:
    "Sit for 40 to 50 minutes with one written goal, then take a real break. More hours are not the fix.",
  stress:
    "Name the one worry sitting heaviest, so it is not going round and round in your head.",
};

function factorKeysIn(text: string) {
  return (Object.keys(FACTOR_MARKERS) as AdviceFactorKey[]).filter((key) =>
    FACTOR_MARKERS[key].some((pattern) => pattern.test(text))
  );
}

function bandRank(level: string) {
  if (level === "high" || level === "severe") return 0;
  if (level === "moderate") return 1;
  return 2;
}

function factorsNeedingAdvice(factors: StudentFactors) {
  return adviceFactors(factors)
    .filter((item) => bandRank(item.level) < 2)
    .sort((a, b) => bandRank(a.level) - bandRank(b.level) || b.score - a.score);
}

type ShownFactor = {
  id: string;
  label: string;
  text: string;
  full: boolean;
  high: boolean;
  percent: number | null;
};

function isFullFactorScore(score: number) {
  return Number(score.toFixed(2)) >= 1;
}

function percentFromAdviceText(text: string) {
  const score = text.match(/\((\d+\.\d{2})\)/)?.[1];
  if (score) return Math.round(Number(score) * 100);
  const percent = text.match(/(\d+)%/);
  return percent ? Number(percent[1]) : null;
}

function currentFactorLines(factors: StudentFactors): ShownFactor[] {
  return factorsNeedingAdvice(factors).map((item) => {
    const label = item.name.charAt(0).toUpperCase() + item.name.slice(1);
    const score = item.score.toFixed(2);
    const full = isFullFactorScore(item.score);
    const percent = Math.round(item.score * 100);
    if (bandRank(item.level) === 0) {
      return {
        id: item.key,
        label,
        full,
        high: true,
        percent,
        text: full
          ? `${label} is at 100% this week (${score}). Start here.`
          : `${label} is high this week (${score}). Start here.`,
      };
    }
    return {
      id: item.key,
      label,
      full: false,
      high: false,
      percent,
      text: `${label} is moderate this week (${score}). These steps can bring it toward low.`,
    };
  });
}

function referralSentence(factors: ShownFactor[]) {
  const labels = factors.map((factor) => factor.label);
  const variables =
    labels.length <= 1
      ? (labels[0] ?? "")
      : labels.length === 2
        ? `${labels[0]} and ${labels[1]}`
        : `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
  return `${variables}. You are required to seek counseling at the Guidance Office.`;
}

/** High factors first, then moderate, so each one still gets a tip toward low. */
function orderTips(actions: string[], factors: StudentFactors | null) {
  if (!factors) return actions;
  const ranked = factorsNeedingAdvice(factors);

  const used = new Set<string>();
  const tips: string[] = [];

  for (const factor of ranked) {
    const dedicated = actions.find((action) => {
      if (used.has(action)) return false;
      const keys = factorKeysIn(action);
      return keys.length === 1 && keys[0] === factor.key;
    });
    const shared = actions.find((action) => {
      if (used.has(action)) return false;
      return factorKeysIn(action).includes(factor.key);
    });
    const tip = dedicated ?? shared ?? DEFAULT_TIPS[factor.key];
    if (used.has(tip)) continue;
    used.add(tip);
    tips.push(tip);
  }

  return tips.map((tip) =>
    tip.replace(
      /Write next week's quizzes, projects, and readings on one page with due dates, then circle what is due first\.?/gi,
      GENERAL_WORKLOAD_TIP
    )
  );
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
  const actions = recommendation.recommended_actions.map(stripQuestionnaireItemLabel);
  const currentScore = recommendation.mfbi_score;
  const currentLevel =
    currentScore != null && Number.isFinite(Number(currentScore))
      ? classifyMfbiScore(Number(currentScore))
      : recommendation.risk_level;
  const hasPrediction =
    nextWeekScore != null && Number.isFinite(Number(nextWeekScore));
  const looks =
    currentScore != null && Number.isFinite(Number(currentScore))
      ? `This week is ${classifyMfbiScore(Number(currentScore)).toLowerCase()} (${Number(currentScore).toFixed(2)}). The tips follow these current scores.`
      : recommendation.assessment_summary;
  const forecast = hasPrediction
    ? predictionLine(Number(nextWeekScore), nextWeekRisk)
    : null;
  const shownFactors: ShownFactor[] = factors
    ? currentFactorLines(factors)
    : (compact
        ? recommendation.contributing_factors.slice(0, 4)
        : recommendation.contributing_factors
      )
        .map(stripQuestionnaireItemLabel)
        .map((text) => ({
          id: text,
          label: text,
          text,
          full: /\(1\.00\)|100%/.test(text),
          high: /is high|100%|\(1\.00\)/i.test(text),
          percent: percentFromAdviceText(text),
        }));
  const highFactors = shownFactors.filter((factor) => factor.high);
  const shownActions = orderTips(actions, factors);
  const support = recommendation.human_support;

  return (
    <div className="student-chum-prose space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Current burnout risk
          </p>
          <p
            className={cn(
              "text-xl font-semibold tracking-tight",
              riskTone(currentLevel)
            )}
          >
            {currentLevel
              ? `${currentLevel} risk`
              : "Risk available after monitoring"}
          </p>
        </div>
        {currentScore != null && Number.isFinite(Number(currentScore)) ? (
          <p className="text-sm text-muted-foreground">
            This week:{" "}
            <span className="font-medium text-foreground">
              {Number(currentScore).toFixed(2)}
            </span>
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          How this week looks
        </p>
        <p className="text-sm font-medium text-foreground">{looks}</p>
        {forecast ? (
          <p className="text-sm text-muted-foreground">{forecast}</p>
        ) : null}
      </div>

      {highFactors.length ? (
        <div className="space-y-1 rounded-lg border border-red-500/25 bg-red-50/60 px-3 py-2 dark:bg-red-950/25">
          <p className="text-xs font-medium uppercase tracking-wide text-red-800 dark:text-red-300">
            Guidance referral
          </p>
          <p className="text-sm text-foreground">
            {referralSentence(highFactors)}
          </p>
        </div>
      ) : null}

      {shownFactors.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            What is weighing on you this week
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {shownFactors.map((factor) => (
              <li key={factor.id} className="flex items-baseline gap-2">
                {factor.high && factor.percent != null ? (
                  <span className="inline-flex shrink-0 rounded-md bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
                    {factor.percent}%
                  </span>
                ) : null}
                <span>{factor.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {shownActions.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Things you can try this week
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
          Advice for this week
        </CardTitle>
        <CardDescription>
          Tips follow your current scores. Next week is only a prediction.
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
