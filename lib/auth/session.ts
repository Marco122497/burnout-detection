import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  getDashboardPath,
  toProfile,
  type Profile,
  type UserRole,
} from "@/lib/auth/roles";

const PROFILE_COLUMNS =
  "id, role, employee_no, student_number, first_name, middle_name, last_name, suffix, sex, birth_date, age, civil_status, contact_number, address, profile_picture, course, year_level, section, enrollment_status, designation, employment_status, department_id, is_active, is_verified, last_login, created_at, updated_at";

/**
 * Deduped within a single RSC request tree (layout + page share one fetch).
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, profile: null as Profile | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    profile: profile ? toProfile(profile) : null,
  };
});

export async function requireUser() {
  const session = await getSessionUser();

  if (!session.user || !session.profile) {
    redirect("/login");
  }

  if (!session.profile.is_active) {
    await session.supabase.auth.signOut();
    redirect("/login?error=inactive");
  }

  return {
    supabase: session.supabase,
    user: session.user,
    profile: session.profile,
  };
}

export async function requireRole(allowed: UserRole[]) {
  const session = await requireUser();

  if (!allowed.includes(session.profile.role)) {
    redirect(getDashboardPath(session.profile.role));
  }

  return session;
}
