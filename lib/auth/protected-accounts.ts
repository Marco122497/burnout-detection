/** Seed / primary Guidance Counselor login — other admins cannot manage it. */
export const PRIMARY_GUIDANCE_EMAIL = "guidance@school.edu";

/** Only this account can run bulk “Fill week for all” on Student Monitoring. */
export const SUPERADMIN_EMAIL = "superadmin@school.edu";

export function isPrimaryGuidanceEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === PRIMARY_GUIDANCE_EMAIL;
}

export function isSuperadminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === SUPERADMIN_EMAIL;
}

/** Guidance dashboard AI health, accuracy, and related model metrics. */
export function canViewAiModelStatus(email: string | null | undefined) {
  return isSuperadminEmail(email) || isPrimaryGuidanceEmail(email);
}

/**
 * Other Guidance admins cannot edit, deactivate, reset, or delete the
 * primary Guidance account. Only that account’s owner can manage it.
 */
export function canManagePrimaryGuidanceAccount(options: {
  actorId: string;
  targetId: string;
  targetEmail: string | null | undefined;
}) {
  if (!isPrimaryGuidanceEmail(options.targetEmail)) return true;
  return options.actorId === options.targetId;
}

export const PRIMARY_GUIDANCE_MANAGE_ERROR =
  "The primary Guidance account (guidance@school.edu) can only be edited or deleted by its owner.";

export const SUPERADMIN_FILL_ERROR =
  "Only superadmin@school.edu can fill a monitoring week for all students.";
