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
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    return response;
  }

  const roleHome = getDashboardPath(profile.role as UserRole);

  if (pathname === "/" || GUEST_ONLY_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = roleHome;
    url.search = "";
    return NextResponse.redirect(url);
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
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
