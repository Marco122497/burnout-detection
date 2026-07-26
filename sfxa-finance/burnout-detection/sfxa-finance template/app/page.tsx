import { redirect } from "next/navigation";

import { getDashboardPath } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";

export default async function HomePage() {
  const { user, profile } = await getSessionUser();

  if (user && profile?.status) {
    redirect(getDashboardPath(profile.role));
  }

  redirect("/login");
}
