
import { DepartmentsManager } from "@/components/guidance/departments-manager";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getDepartmentsWithCounts } from "@/lib/guidance/queries";

export const metadata = {
  title: "Departments",
};

export default async function GuidanceDepartmentsPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const departments = await getDepartmentsWithCounts(supabase);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Departments"
        description="Add, edit, activate/deactivate departments and view membership counts."
      />
      <DepartmentsManager departments={departments} />
    </div>
  );
}
