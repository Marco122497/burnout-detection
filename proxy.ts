import { NextResponse, type NextRequest } from "next/server";

import { getDashboardPath, type UserRole } from "@/lib/auth/roles";
import { updateSession } from "@/lib/supabase/proxy";

const GUEST_ONLY_ROUTES = ["/login", "/forgot-password", "/register"];
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/forgot-password",
  "/register",
  "/reset-password",
  "/auth/callback",
];

/** Redirect while preserving Supabase session cookies from updateSession. */
function redirectWithSession(url: URL, supabaseResponse: NextResponse) {
  const response = NextResponse.redirect(url);
  // Must copy cookies — a bare redirect drops refreshed auth tokens.
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const { user, supabase, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Server Actions POST to the page URL. Auth redirects here return HTML/empty
  // bodies and break the action protocol ("unexpected response from the server").
  // Session cookies still refresh via updateSession above; actions enforce auth.
  if (request.headers.has("next-action")) {
    return supabaseResponse;
  }

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return redirectWithSession(url, supabaseResponse);
  }

  if (!user) {
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (pathname === "/reset-password" || pathname.startsWith("/reset-password/")) {
    return supabaseResponse;
  }

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", profile ? "inactive" : "noprofile");
    return redirectWithSession(url, supabaseResponse);
  }

  const roleHome = getDashboardPath(profile.role as UserRole);

  if (pathname === "/" || GUEST_ONLY_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = roleHome;
    url.search = "";
    return redirectWithSession(url, supabaseResponse);
  }

  const rolePrefixes = [
    "/student",
    "/instructor",
    "/guidance",
  ] as const;

  const visitingOtherRole = rolePrefixes.some(
    (prefix) =>
      (pathname === prefix || pathname.startsWith(`${prefix}/`)) &&
      !pathname.startsWith(roleHome)
  );

  if (visitingOtherRole) {
    const url = request.nextUrl.clone();
    url.pathname = roleHome;
    return redirectWithSession(url, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
