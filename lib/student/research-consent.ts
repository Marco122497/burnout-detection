import type { SupabaseClient } from "@supabase/supabase-js";

/** Current electronic informed consent form version. */
export const RESEARCH_CONSENT_VERSION = "v1.1";

export const RESEARCH_CONSENT_STUDY_TITLE =
  "Development of an AI-Driven Academic Burnout Detection and Early Warning System Using a Multi-Factor Burnout Index for College Students.";

export type ResearchConsentStatus = "Agreed" | "Declined";

export function hasAgreedResearchConsent(
  status: string | null | undefined,
  version?: string | null
): boolean {
  return (
    status === "Agreed" &&
    (!version || version === RESEARCH_CONSENT_VERSION)
  );
}

/** True when the student must complete/re-confirm informed consent. */
export function needsResearchConsent(
  status: string | null | undefined,
  version?: string | null
): boolean {
  return !hasAgreedResearchConsent(status, version);
}

export type ResolvedResearchConsent = {
  needsConsent: boolean;
  declined: boolean;
  hasAgreed: boolean;
};

/**
 * Source of truth is `research_consents` for the current form version.
 * If those rows were deleted but `profiles` still says Agreed, clear the
 * stale profile flags and require consent again.
 */
export async function resolveStudentResearchConsent(
  supabase: SupabaseClient,
  studentId: string,
  profileStatus?: string | null,
  profileVersion?: string | null
): Promise<ResolvedResearchConsent> {
  const { data: latest, error } = await supabase
    .from("research_consents")
    .select("consent_status, consent_version, consented_at")
    .eq("student_id", studentId)
    .order("consented_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Table / columns not migrated yet — fall back to profile fields.
  if (error) {
    if (
      /research_consent|does not exist|schema cache/i.test(error.message)
    ) {
      const hasAgreed = hasAgreedResearchConsent(
        profileStatus,
        profileVersion
      );
      return {
        hasAgreed,
        needsConsent: !hasAgreed,
        declined: profileStatus === "Declined",
      };
    }
    // Unexpected read error: fail closed (require consent) for safety.
    return {
      hasAgreed: false,
      needsConsent: true,
      declined: profileStatus === "Declined",
    };
  }

  if (latest && latest.consent_version === RESEARCH_CONSENT_VERSION) {
    const hasAgreed = latest.consent_status === "Agreed";
    const declined = latest.consent_status === "Declined";

    // Keep profile columns aligned with the audit table.
    if (
      profileStatus !== latest.consent_status ||
      profileVersion !== latest.consent_version
    ) {
      await supabase
        .from("profiles")
        .update({
          research_consent_status: latest.consent_status,
          research_consent_version: latest.consent_version,
          research_consent_at: latest.consented_at,
        })
        .eq("id", studentId);
    }

    return {
      hasAgreed,
      needsConsent: !hasAgreed,
      declined,
    };
  }

  // No row for the current version (never consented, deleted, or outdated).
  if (profileStatus != null || profileVersion != null) {
    await supabase
      .from("profiles")
      .update({
        research_consent_status: null,
        research_consent_version: null,
        research_consent_at: null,
      })
      .eq("id", studentId);
  }

  return {
    hasAgreed: false,
    needsConsent: true,
    declined: false,
  };
}
