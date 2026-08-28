export const APP_VERSION = "1.1.1.0-beta";

export const APP_COMPANY = "MarcoD Solutions, Inc.";

export const APP_BUILD_TIME =
  process.env.NEXT_PUBLIC_BUILD_TIME ?? new Date().toISOString();
