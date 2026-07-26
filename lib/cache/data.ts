import { cache } from "react";

import type { createClient } from "@/lib/supabase/server";
import type { Department } from "@/lib/auth/roles";
import type { AcademicTerm } from "@/lib/student/terms";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const DEPARTMENT_COLUMNS =
  "department_id, department_code, department_name, description, is_active, created_at, updated_at";

const TERM_COLUMNS_FULL =
  "term_id, academic_year, semester, start_date, end_date, is_active, monitoring_week, monitoring_enabled";

const TERM_COLUMNS_BASE =
  "term_id, academic_year, semester, start_date, end_date, is_active";

/**
 * Request-scoped dedupe for the active academic term.
 * Falls back if phase5 columns are not migrated yet.
 */
export const getCachedActiveTerm = cache(
  async (supabase: SupabaseClient): Promise<AcademicTerm | null> => {
    const full = await supabase
      .from("academic_terms")
      .select(TERM_COLUMNS_FULL)
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!full.error && full.data) {
      return {
        ...full.data,
        monitoring_week: Number(full.data.monitoring_week ?? 1),
        monitoring_enabled: Boolean(full.data.monitoring_enabled),
      };
    }

    // Columns missing (phase5 not applied) or other select error — degrade gracefully.
    const base = await supabase
      .from("academic_terms")
      .select(TERM_COLUMNS_BASE)
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!base.data) return null;

    return {
      ...base.data,
      monitoring_week: 1,
      monitoring_enabled: false,
    };
  }
);

/**
 * Request-scoped department list (narrow columns).
 */
export const getCachedDepartments = cache(
  async (supabase: SupabaseClient): Promise<Department[]> => {
    const { data } = await supabase
      .from("departments")
      .select(DEPARTMENT_COLUMNS)
      .order("department_name", { ascending: true });

    return (data ?? []) as Department[];
  }
);
