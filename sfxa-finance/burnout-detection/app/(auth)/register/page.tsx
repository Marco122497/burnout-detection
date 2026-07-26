import { RegisterForm } from "@/components/auth/register-form";
import type { Department } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getActiveDepartments(): Promise<Department[]> {
  const select =
    "department_id, department_code, department_name, description, is_active, created_at, updated_at";

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("departments")
      .select(select)
      .eq("is_active", true)
      .order("department_name", { ascending: true });
    if (data?.length) return data as Department[];
  } catch {
    // Fall back to anon/authenticated client when service role is missing.
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select(select)
    .eq("is_active", true)
    .order("department_name", { ascending: true });

  return (data ?? []) as Department[];
}

export default async function RegisterPage() {
  const departments = await getActiveDepartments();
  return <RegisterForm departments={departments} />;
}
