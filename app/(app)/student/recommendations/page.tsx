
import { RecommendationsView } from "@/components/student/recommendations-view";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { parseEarlyWarningRemarks } from "@/lib/student/ai-client";
import { ensureRagRecommendation } from "@/lib/student/ensure-rag";
import { classifyMfbiScore, resolveMfbiBurnoutLevel } from "@/lib/student/mfbi";
import { getLatestBurnoutSnapshot, getLatestRagRecommendation } from "@/lib/student/queries";
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
  const existingRag = snapshot.latest
    ? await getLatestRagRecommendation(
        supabase,
        user.id,
        snapshot.latest.monitoring_id
      )
    : null;
  // Prefer saved advice first so the page renders quickly; regenerate only if missing.
  const ragRecommendation =
    existingRag ??
    (await ensureRagRecommendation(supabase, user.id, snapshot.latest));
  if (existingRag && snapshot.latest) {
    void ensureRagRecommendation(supabase, user.id, snapshot.latest).catch(
      (error) => console.error("background ensureRagRecommendation:", error)
    );
  }

  const earlyWarning = parseEarlyWarningRemarks(
    snapshot.latest?.prediction?.remarks ?? null
  );
  const nextWeekScore =
    earlyWarning?.next_week_score != null
      ? Number(earlyWarning.next_week_score)
      : null;
  const nextWeekRisk =
    nextWeekScore != null && Number.isFinite(nextWeekScore)
      ? classifyMfbiScore(nextWeekScore)
      : earlyWarning?.next_week_risk ?? null;
  const previous = snapshot.history[1] ?? null;
  const previousMfbi = previous?.mfbi_results
    ? Array.isArray(previous.mfbi_results)
      ? previous.mfbi_results[0]
      : previous.mfbi_results
    : null;
  const currentMfbi = snapshot.mfbi;
  const factors =
    snapshot.latest && currentMfbi
      ? buildStudentFactors(snapshot.latest, currentMfbi)
      : null;
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
    currentLevel: resolveMfbiBurnoutLevel(
      currentMfbi?.mfbi_score ?? null,
      currentMfbi?.burnout_level ?? null
    ),
    nextWeekRisk,
    earlyWarningTrend: earlyWarning?.trend ?? null,
    currentMfbi: currentMfbi?.mfbi_score ?? null,
    previousMfbi: previousMfbi?.mfbi_score ?? null,
    factors,
    previousFactors,
  });

  return (
    <div className="space-y-6">
      <PageHeading
        title="Recommendations"
        description="Personalized next-week guidance based on your latest monitoring results."
      />
      <RecommendationsView
        burnoutLevel={counseling?.burnout_level ?? null}
        guidance={
          counseling
            ? {
                title: counseling.title,
                description: counseling.description,
                burnout_level: counseling.burnout_level,
                recommended_action: counseling.recommended_action,
              }
            : null
        }
        factorRecommendations={counseling?.factors ?? []}
        recommendationBasis={counseling?.basis ?? null}
        recommendationTrend={counseling?.trend ?? null}
        currentLevel={counseling?.currentLevel ?? null}
        nextWeekRisk={counseling?.nextWeekRisk ?? null}
        currentMfbi={counseling?.currentMfbi ?? null}
        previousMfbi={counseling?.previousMfbi ?? null}
        ragRecommendation={ragRecommendation}
        nextWeekScore={
          nextWeekScore != null && Number.isFinite(nextWeekScore)
            ? nextWeekScore
            : null
        }
      />
    </div>
  );
}
