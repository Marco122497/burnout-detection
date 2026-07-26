import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getDashboardPath, type Profile, type UserRole } from "@/lib/auth/roles";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    profile: profile as Profile | null,
  };
}

export async function requireUser() {
  const session = await getSessionUser();

  if (!session.user || !session.profile) {
    redirect("/login");
  }

  if (!session.profile.status) {
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

export async function requireAdmin() {
  return requireRole(["Administrator"]);
}

export async function requireTreasurer() {
  return requireRole(["Treasurer"]);
}

export async function requireParishOfficer() {
  return requireRole(["Parish Officer"]);
}
