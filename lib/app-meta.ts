export const APP_VERSION = "1.1.1.24-beta";

export const APP_COMPANY = "MarcoD Solutions, Inc.";

export const APP_DEVELOPER = "Dether John Gorre";

export const APP_BUILD_TIME =
  process.env.NEXT_PUBLIC_BUILD_TIME ?? new Date().toISOString();

/** Display version matching the sidebar footer, e.g. `v1.1.1.24-beta`. */
export function formatAppVersion() {
  return `v${APP_VERSION}`;
}

export function formatAppFooterLabel() {
  return `Generated from Burnout Detection System (${formatAppVersion()})`;
}
  