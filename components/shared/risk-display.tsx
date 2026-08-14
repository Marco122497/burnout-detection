import { cn } from "@/lib/utils";

export function riskTone(level: string | null | undefined) {
  if (level === "High" || level === "Severe") {
    return "text-red-700 dark:text-red-400";
  }
  if (level === "Moderate") return "text-amber-700 dark:text-amber-400";
  if (level === "Low") return "text-emerald-700 dark:text-emerald-400";
  return "text-muted-foreground";
}

/** Representative score for risk-level projections (not measured MFBI). */
export function riskLevelToChartScore(
  level: string | null | undefined
): number | null {
  if (level === "High" || level === "Severe") return 0.85;
  if (level === "Moderate") return 0.55;
  if (level === "Low") return 0.2;
  return null;
}

export function RiskLevelText({
  level,
  score,
}: {
  level: string | null | undefined;
  /** Optional value shown beside the level, e.g. MFBI `0.47`. */
  score?: number | null;
}) {
  if (!level) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("font-medium tabular-nums", riskTone(level))}>
      {level}
      {score != null && !Number.isNaN(Number(score))
        ? ` (${Number(score).toFixed(2)})`
        : ""}
    </span>
  );
}

export function PredictionLabel({ level }: { level: string | null | undefined }) {
  if (!level) return <span className="text-muted-foreground">—</span>;
  const score = riskLevelToChartScore(level);
  return (
    <span className="tabular-nums text-foreground">
      {level}
      {score != null ? ` (${score.toFixed(2)})` : ""}
    </span>
  );
}

export function scoreOverMax(value: number | null | undefined, max: number) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value)}/${max}`;
}

/** Flip a load/risk score so a higher displayed value means healthier. */
export function invertedScoreOverMax(
  riskValue: number | null | undefined,
  max: number
) {
  if (riskValue == null || Number.isNaN(Number(riskValue))) return "—";
  const quality = Math.round((max - Number(riskValue)) * 100) / 100;
  const clamped = Math.min(max, Math.max(0, quality));
  return `${clamped}/${max}`;
}
