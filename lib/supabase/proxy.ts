import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

export type SessionCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export type SessionCookieJar = {
  current: SessionCookie[];
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });
  const cookieJar: SessionCookieJar = { current: [] };

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookieJar.current = cookiesToSet;
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
  } = await supabase.auth.getUser();

  // A failed refresh must not clear cookies. Parallel student, instructor,
  // and guidance requests can rotate the same token; wiping cookies signs
  // the user out and sends them back to login.
  if (!user) {
    return {
      user: null,
      supabase,
      supabaseResponse: NextResponse.next({ request }),
      cookieJar: { current: [] },
    };
  }

  return { user, supabase, supabaseResponse, cookieJar };
}
