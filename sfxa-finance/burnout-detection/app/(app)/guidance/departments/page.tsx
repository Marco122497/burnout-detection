import { DepartmentsManager } from "@/components/guidance/departments-manager";
import { requireRole } from "@/lib/auth/session";
import { getDepartmentsWithCounts } from "@/lib/guidance/queries";

export default async function GuidanceDepartmentsPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const departments = await getDepartmentsWithCounts(supabase);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Guidance module</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Department Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add, edit, activate/deactivate departments and view membership counts.
        </p>
      </div>
      <DepartmentsManager departments={departments} />
    </div>
  );
}
