import { NextResponse, type NextRequest } from "next/server";

import { getDashboardPath, type UserRole } from "@/lib/auth/roles";
import { updateSession } from "@/lib/supabase/proxy";

const GUEST_ONLY_ROUTES = ["/login", "/forgot-password", "/register"];
const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/register",
  "/reset-password",
  "/auth/callback",
];

export async function proxy(request: NextRequest) {
  const { user, supabase, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!user) {
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  // Allow password recovery without a complete/active profile redirect loop
  if (pathname === "/reset-password" || pathname.startsWith("/reset-password/")) {
    return supabaseResponse;
  }

  if (!profile || !profile.status) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", profile ? "inactive" : "noprofile");
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    return response;
  }

  if (GUEST_ONLY_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = getDashboardPath(profile.role as UserRole);
    url.search = "";
    return NextResponse.redirect(url);
  }

  const roleHome = getDashboardPath(profile.role as UserRole);
  const rolePrefixes = [
    "/administrator",
    "/treasurer",
    "/parish-officer",
  ] as const;

  const visitingOtherRole = rolePrefixes.some(
    (prefix) =>
      (pathname === prefix || pathname.startsWith(`${prefix}/`)) &&
      !pathname.startsWith(roleHome)
  );

  if (visitingOtherRole) {
    const url = request.nextUrl.clone();
    url.pathname = roleHome;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
