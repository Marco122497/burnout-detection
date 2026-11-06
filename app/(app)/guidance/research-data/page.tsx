import { redirect } from "next/navigation";

import { ResearchDataDownloads } from "@/components/guidance/research-data-downloads";
import { PageHeading } from "@/components/layout/page-heading";
import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Research Data Export",
};

export default async function ResearchDataPage() {
  const { user } = await requireRole(["Guidance Counselor"]);
  if (!isSuperadminEmail(user.email)) {
    redirect("/guidance");
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeading
        title="Research Data Export"
        description="Anonymized datasets for statistical analysis and thesis documentation. Names, email addresses, and student numbers are left out."
        actions={
          <span className="rounded-full border px-2.5 py-1 text-xs font-medium">
            Admin only
          </span>
        }
      />
      <ResearchDataDownloads />
    </div>
  );
}
