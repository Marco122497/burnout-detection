import { LightbulbIcon } from "lucide-react";

import { RecommendationsView } from "@/components/student/recommendations-view";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { parseEarlyWarningRemarks } from "@/lib/student/ai-client";
import { resolveMfbiBurnoutLevel } from "@/lib/student/mfbi";
import { getLatestBurnoutSnapshot } from "@/lib/student/queries";
import {
  buildPersonalizedCounselingRecommendation,
  buildStudentFactors,
} from "@/lib/student/tips";

export const metadata = {
  title: "Recommendations",
};

export default async function StudentRecommendationsPage() {
  const { supabase, user } = await requireRole(["Student"]);
  const snapshot = await getLatestBurnoutSnapshot(supabase, user.id);
  const earlyWarning = parseEarlyWarningRemarks(
    snapshot.latest?.prediction?.remarks ?? null
  );
  const previous = snapshot.history[1] ?? null;
  const previousMfbi = previous?.mfbi_results
    ? Array.isArray(previous.mfbi_results)
      ? previous.mfbi_results[0]
      : previous.mfbi_results
    : null;

  const currentLevel = resolveMfbiBurnoutLevel(
    snapshot.mfbi?.mfbi_score ?? null,
    snapshot.mfbi?.burnout_level ?? null
  );
  const latest = snapshot.latest;
  const mfbi = snapshot.mfbi;
  const factors =
    latest && mfbi ? buildStudentFactors(latest, mfbi) : null;
  const previousFactors =
    previous && previousMfbi
      ? buildStudentFactors(
          {
            stress_score: previous.stress_score,
            academic_workload: previous.academic_workload,
            study_time: previous.study_time,
            sleep_hours: previous.sleep_hours,
          },
          previousMfbi
        )
      : null;

  const counseling = buildPersonalizedCounselingRecommendation({
    currentLevel,
    nextWeekRisk: earlyWarning?.next_week_risk ?? null,
    earlyWarningTrend: earlyWarning?.trend ?? null,
    currentMfbi: mfbi?.mfbi_score ?? null,
    previousMfbi: previousMfbi?.mfbi_score ?? null,
    factors,
    previousFactors,
  });

  const guidance = counseling
    ? {
        title: counseling.title,
        description: counseling.description,
        burnout_level: counseling.burnout_level,
        recommended_action: counseling.recommended_action,
      }
    : null;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Counseling Recommendation"
        description="Next-week early warning outlook, plus what to do this week for stress, schoolwork, study time, and sleep — based on your latest and previous weekly monitoring."
        icon={LightbulbIcon}
      />
      <RecommendationsView
        burnoutLevel={counseling?.burnout_level ?? null}
        guidance={guidance}
        factorRecommendations={counseling?.factors ?? []}
        recommendationBasis={counseling?.basis ?? null}
        recommendationTrend={counseling?.trend ?? null}
        currentLevel={currentLevel}
        nextWeekRisk={earlyWarning?.next_week_risk ?? null}
        currentMfbi={mfbi?.mfbi_score ?? null}
        previousMfbi={previousMfbi?.mfbi_score ?? null}
      />
    </div>
  );
}
