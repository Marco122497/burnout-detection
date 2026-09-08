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
