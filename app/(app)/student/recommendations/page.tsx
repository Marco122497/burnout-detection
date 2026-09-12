
import { RecommendationsView } from "@/components/student/recommendations-view";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { parseEarlyWarningRemarks } from "@/lib/student/ai-client";
import { ensureRagRecommendation } from "@/lib/student/ensure-rag";
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
  const ragRecommendation = await ensureRagRecommendation(
    supabase,
    user.id,
    snapshot.latest
  );
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
        title="Advice for this week"
        description="A plain-language look at this week, based on your scores and school well-being guidance."
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
        ragRecommendation={ragRecommendation}
      />
    </div>
  );
}
