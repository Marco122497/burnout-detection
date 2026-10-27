import { redirect } from "next/navigation";

import { ResearchDataDownloads } from "@/components/guidance/research-data-downloads";
import { PageHeading } from "@/components/layout/page-heading";
import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Research data",
};

export default async function ResearchDataPage() {
  const { user } = await requireRole(["Guidance Counselor"]);
  if (!isSuperadminEmail(user.email)) {
    redirect("/guidance");
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeading
        title="Research data"
        description="Chapter 4 files for every monitoring week, including Week 3 and later weeks. Names, emails, and student numbers are left out. Screenshots are listed, not captured."
      />
      <ResearchDataDownloads />
    </div>
  );
}
