import { GuidanceDashboard } from "@/components/guidance/guidance-dashboard";
import { requireRole } from "@/lib/auth/session";
import { getGuidanceDashboardStats } from "@/lib/guidance/queries";

export default async function GuidanceDashboardPage() {
  const { supabase, profile } = await requireRole(["Guidance Counselor"]);
  const stats = await getGuidanceDashboardStats(supabase);

  return (
    <GuidanceDashboard firstName={profile.first_name} stats={stats} />
  );
}
