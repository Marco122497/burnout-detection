/** Seed / primary Guidance Counselor login — other admins cannot manage it. */
export const PRIMARY_GUIDANCE_EMAIL = "guidance@school.edu";

export function isPrimaryGuidanceEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === PRIMARY_GUIDANCE_EMAIL;
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
