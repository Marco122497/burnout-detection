import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANT: Do not add logic between createServerClient and getUser().
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Stale/invalid refresh tokens leave the browser stuck; clear auth cookies.
  if (
    error &&
    (error.message?.includes("Refresh Token") ||
      error.code === "refresh_token_not_found")
  ) {
    const cleared = NextResponse.next({ request });
    request.cookies.getAll().forEach((cookie) => {
      if (
        cookie.name.includes("auth-token") ||
        cookie.name.startsWith("sb-")
      ) {
        cleared.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
        request.cookies.delete(cookie.name);
      }
    });
    return { user: null, supabase, supabaseResponse: cleared };
  }

  return { user, supabase, supabaseResponse };
}
