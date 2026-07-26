import { redirect } from "next/navigation";

import { getDashboardPath } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const { profile } = await requireUser();
  redirect(getDashboardPath(profile.role));
}
