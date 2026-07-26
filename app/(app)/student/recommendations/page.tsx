import { RecommendationsView } from "@/components/student/recommendations-view";
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
      <div>
        <p className="text-sm font-medium text-primary">Student module</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Recommendations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Counseling guidance matched to your burnout risk level.
        </p>
      </div>
      <RecommendationsView burnoutLevel={burnoutLevel} guidance={guidance} />
    </div>
  );
}
