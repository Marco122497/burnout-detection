import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

function requireServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  // Accept real keys (JWT eyJ… or new sb_secret_…). Reject placeholders only.
  const isPlaceholder =
    !value ||
    value === "your-service-role-key" ||
    value.startsWith("your-") ||
    value.includes("your-service-role-jwt");

  if (isPlaceholder) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add the Legacy service_role JWT (eyJ…) to .env.local (see .env.example)."
    );
  }

  return value;
}

/** Server-only admin client. Never import this into client components. */
export function createAdminClient() {
  const { url } = getSupabaseEnv();

  return createClient(url, requireServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
