import type { createClient } from "@/lib/supabase/server";
import { getCachedActiveTerm } from "@/lib/cache/data";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type AcademicTerm = {
  term_id: number;
  academic_year: string;
  semester: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  monitoring_week: number;
  monitoring_enabled: boolean;
};

/** Uses request-scoped cache — safe to call multiple times per render. */
export async function getActiveTerm(
  supabase: SupabaseClient
): Promise<AcademicTerm | null> {
  return getCachedActiveTerm(supabase);
}

/** Active monitoring week set by Guidance (defaults to 1). */
export function getCurrentWeekNumber(term: AcademicTerm) {
  return Math.max(1, Number(term.monitoring_week) || 1);
}

export function isMonitoringOpen(term: AcademicTerm | null) {
  return Boolean(term?.monitoring_enabled);
}
