import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

function requireServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!value || value.includes("your-service") || value.includes("your-secret")) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (see .env.example)."
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
