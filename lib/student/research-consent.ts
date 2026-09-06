/** Current electronic informed consent form version. */
export const RESEARCH_CONSENT_VERSION = "v1.0";

export const RESEARCH_CONSENT_STUDY_TITLE =
  "Development of an AI-Driven Academic Burnout Detection and Early Warning System Using a Multi-Factor Burnout Index for College Students.";

export type ResearchConsentStatus = "Agreed" | "Declined";

export function hasAgreedResearchConsent(
  status: string | null | undefined
): boolean {
  return status === "Agreed";
}
