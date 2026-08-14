import { LightbulbIcon } from "lucide-react";

import { RecommendationsView } from "@/components/student/recommendations-view";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import type { BurnoutLevel } from "@/lib/student/mfbi";
import { getLatestBurnoutSnapshot } from "@/lib/student/queries";
import {
  getFactorRecommendations,
  getOverallRecommendation,
} from "@/lib/student/tips";

export const metadata = {
  title: "Recommendations",
};

export default async function StudentRecommendationsPage() {
  const { supabase, user } = await requireRole(["Student"]);
  const snapshot = await getLatestBurnoutSnapshot(supabase, user.id);
  const burnoutLevel =
    ((snapshot.latest?.prediction?.final_prediction ||
      snapshot.mfbi?.burnout_level) as BurnoutLevel | undefined) ?? null;

  const latest = snapshot.latest;
  const mfbi = snapshot.mfbi;
  const factors =
    latest && mfbi
      ? {
          stress: {
            raw: latest.stress_score,
            normalized: mfbi.normalized_stress,
          },
          workload: {
            raw: latest.academic_workload,
            normalized: mfbi.normalized_workload,
          },
          studyTime: {
            raw: latest.study_time,
            normalized: mfbi.normalized_study_time,
          },
          sleep: {
            raw: latest.sleep_hours,
            normalized: mfbi.normalized_sleep,
          },
        }
      : null;

  const overall = getOverallRecommendation(burnoutLevel);
  const factorRecommendations = getFactorRecommendations(factors);
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
        description="Simple tips based on your burnout score, stress, schoolwork, study time, and sleep."
        icon={LightbulbIcon}
      />
      <RecommendationsView
        burnoutLevel={burnoutLevel}
        guidance={guidance}
        factorRecommendations={factorRecommendations}
      />
    </div>
  );
}
