import { redirect } from "next/navigation";

import { CompletedRecordsChart } from "@/components/guidance/completed-records-chart";
import {
  ParticipationChart,
  ProgramDistributionChart,
  YearLevelDistributionChart,
} from "@/components/guidance/distribution-charts";
import {
  FactorMeansChart,
  MfbiMeanChart,
} from "@/components/guidance/factor-mean-charts";
import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Charts",
};

export default async function GuidanceChartsPage() {
  const { user } = await requireRole(["Guidance Counselor"]);
  if (!isSuperadminEmail(user.email)) {
    redirect("/guidance");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16">
      <CompletedRecordsChart />
      <ProgramDistributionChart />
      <YearLevelDistributionChart />
      <ParticipationChart />
      <FactorMeansChart />
      <MfbiMeanChart />
    </div>
  );
}
