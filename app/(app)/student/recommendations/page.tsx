import { LightbulbIcon } from "lucide-react";

import { RecommendationsView } from "@/components/student/recommendations-view";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import type { BurnoutLevel } from "@/lib/student/mfbi";
import { getLatestBurnoutSnapshot } from "@/lib/student/queries";

export default async function StudentRecommendationsPage() {
  const { supabase, user } = await requireRole(["Student"]);
  const snapshot = await getLatestBurnoutSnapshot(supabase, user.id);
  const burnoutLevel =
    ((snapshot.latest?.prediction?.final_prediction ||
      snapshot.mfbi?.burnout_level) as BurnoutLevel | undefined) ?? null;

  let guidance: {
    title: string;
    description: string;
    burnout_level: string;
    recommended_action?: string | null;
  } | null = null;

  if (burnoutLevel) {
    const { data } = await supabase
      .from("recommendations")
      .select("title, description, recommended_action, burnout_risk_level")
      .eq("burnout_risk_level", burnoutLevel)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data) {
      guidance = {
        title: data.title,
        description: data.description,
        burnout_level: data.burnout_risk_level,
        recommended_action: data.recommended_action,
      };
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Recommendations"
        description="Counseling guidance matched to your burnout risk level."
        icon={LightbulbIcon}
      />
      <RecommendationsView burnoutLevel={burnoutLevel} guidance={guidance} />
    </div>
  );
}
