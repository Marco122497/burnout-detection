import { LightbulbIcon } from "lucide-react";

import { RecommendationsView } from "@/components/student/recommendations-view";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { parseEarlyWarningRemarks } from "@/lib/student/ai-client";
import type { BurnoutLevel } from "@/lib/student/mfbi";
import { getLatestBurnoutSnapshot } from "@/lib/student/queries";
import {
  buildStudentFactors,
  getFactorRecommendations,
  getOverallRecommendation,
  resolveRecommendationLevel,
  resolveRecommendationTrend,
} from "@/lib/student/tips";

export const metadata = {
  title: "Recommendations",
};

export default async function StudentRecommendationsPage() {
  const { supabase, user } = await requireRole(["Student"]);
  const snapshot = await getLatestBurnoutSnapshot(supabase, user.id);
  const currentLevel =
    ((snapshot.latest?.prediction?.final_prediction ||
      snapshot.mfbi?.burnout_level) as BurnoutLevel | undefined) ?? null;
  const earlyWarning = parseEarlyWarningRemarks(
    snapshot.latest?.prediction?.remarks ?? null
  );
  const previous = snapshot.history[1] ?? null;
  const previousMfbi = previous?.mfbi_results
    ? Array.isArray(previous.mfbi_results)
      ? previous.mfbi_results[0]
      : previous.mfbi_results
    : null;
  const recommendationTrend = resolveRecommendationTrend(
    earlyWarning?.trend,
    snapshot.mfbi?.mfbi_score ?? null,
    previousMfbi?.mfbi_score ?? null
  );
  const { level: burnoutLevel, basis, trend } = resolveRecommendationLevel(
    currentLevel,
    earlyWarning?.next_week_risk ?? null,
    { trend: recommendationTrend }
  );

  const latest = snapshot.latest;
  const mfbi = snapshot.mfbi;
  const factors =
    latest && mfbi ? buildStudentFactors(latest, mfbi) : null;

  const overall = getOverallRecommendation(burnoutLevel, {
    trend,
    currentMfbi: mfbi?.mfbi_score ?? null,
  });
  const factorRecommendations = getFactorRecommendations(factors, { trend });
  const guidance = overall
    ? {
        title: overall.title,
        description: overall.description,
        burnout_level: overall.burnout_level,
        recommended_action: overall.recommended_action,
      }
    : null;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Recommendations"
        description="Tips that follow your early-warning trend — including when risk is decreasing — plus stress, schoolwork, study time, and sleep."
        icon={LightbulbIcon}
      />
      <RecommendationsView
        burnoutLevel={burnoutLevel}
        guidance={guidance}
        factorRecommendations={factorRecommendations}
        recommendationBasis={basis}
        recommendationTrend={trend}
        currentLevel={currentLevel}
        nextWeekRisk={earlyWarning?.next_week_risk ?? null}
        currentMfbi={mfbi?.mfbi_score ?? null}
      />
    </div>
  );
}
