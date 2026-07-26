import { getSessionUser } from "@/lib/auth/session";
import { getDashboardPath } from "@/lib/auth/roles";
import { getPublicTransparencyData } from "@/lib/public/transparency";
import { TransparencySite } from "@/components/public/transparency-site";

export default async function PublicTransparencyPage() {
  const [{ user, profile }, data] = await Promise.all([
    getSessionUser(),
    getPublicTransparencyData(),
  ]);

  const dashboardHref =
    user && profile?.status ? getDashboardPath(profile.role) : null;

  return (
    <TransparencySite
      dashboardHref={dashboardHref}
      setupRequired={data.setupRequired}
      monthlyDonations={data.monthlyDonations}
      monthlyCollections={data.monthlyCollections}
      budgetUtilization={data.budgetUtilization}
      projects={data.projects}
      announcements={data.announcements}
    />
  );
}
