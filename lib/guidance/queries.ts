import type { createClient } from "@/lib/supabase/server";
import { buildFullName, toProfile, type Department, type Profile } from "@/lib/auth/roles";
import { getCachedDepartments } from "@/lib/cache/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveTerm } from "@/lib/student/terms";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type DepartmentWithCounts = Department & {
  student_count: number;
  instructor_count: number;
};

export type InstructorListItem = Profile & {
  department_name: string | null;
  department_code: string | null;
  email?: string | null;
};

const PROFILE_LIST_COLUMNS =
  "id, role, employee_no, student_number, first_name, middle_name, last_name, suffix, sex, birth_date, age, civil_status, contact_number, address, profile_picture, course, year_level, section, enrollment_status, designation, employment_status, department_id, is_active, is_verified, last_login, created_at, updated_at";

export async function getDepartments(supabase: SupabaseClient) {
  return getCachedDepartments(supabase);
}

export async function getDepartmentsWithCounts(
  supabase: SupabaseClient
): Promise<DepartmentWithCounts[]> {
  const departments = await getDepartments(supabase);
  if (!departments.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("role, department_id, is_active")
    .in(
      "department_id",
      departments.map((d) => d.department_id)
    );

  return departments.map((dept) => {
    const members = (profiles ?? []).filter(
      (p) => p.department_id === dept.department_id && p.is_active
    );
    return {
      ...dept,
      student_count: members.filter((m) => m.role === "Student").length,
      instructor_count: members.filter((m) => m.role === "Instructor").length,
    };
  });
}

export async function getInstructors(
  supabase: SupabaseClient
): Promise<InstructorListItem[]> {
  const { data } = await supabase
    .from("profiles")
    .select(
      `${PROFILE_LIST_COLUMNS}, departments(department_code, department_name)`
    )
    .eq("role", "Instructor")
    .order("last_name", { ascending: true });

  return (data ?? []).map((row) => {
    const dept = row.departments as
      | { department_code: string; department_name: string }
      | { department_code: string; department_name: string }[]
      | null;
    const department = Array.isArray(dept) ? dept[0] : dept;
    const { departments: _ignored, ...profile } = row;

    return {
      ...toProfile(profile),
      department_name: department?.department_name ?? null,
      department_code: department?.department_code ?? null,
    };
  });
}

export type UserListItem = Profile & {
  department_name: string | null;
  department_code: string | null;
  email?: string | null;
};

/**
 * Emails live in auth.users, so this needs the service-role admin client.
 * Returns an empty map when the key is not configured.
 */
export async function getUserEmails(): Promise<Record<string, string>> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {};
  }

  const emails: Record<string, string> = {};
  const perPage = 1000;

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) break;

    for (const user of data.users) {
      if (user.email) emails[user.id] = user.email;
    }

    if (data.users.length < perPage) break;
  }

  return emails;
}

export async function getUsersByRole(
  supabase: SupabaseClient,
  role: Profile["role"]
): Promise<UserListItem[]> {
  const { data } = await supabase
    .from("profiles")
    .select(
      `${PROFILE_LIST_COLUMNS}, departments(department_code, department_name)`
    )
    .eq("role", role)
    .order("last_name", { ascending: true });

  return (data ?? []).map((row) => {
    const dept = row.departments as
      | { department_code: string; department_name: string }
      | { department_code: string; department_name: string }[]
      | null;
    const department = Array.isArray(dept) ? dept[0] : dept;
    const { departments: _ignored, ...profile } = row;

    return {
      ...toProfile(profile),
      department_name: department?.department_name ?? null,
      department_code: department?.department_code ?? null,
    };
  });
}

export async function getGuidanceDashboardStats(supabase: SupabaseClient) {
  const term = await getActiveTerm(supabase);

  const [
    { count: instructorCount },
    { count: studentCount },
    { count: departmentCount },
    { count: activeDeptCount },
    { count: questionnaireCount },
    { data: mfbiRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "Instructor"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "Student"),
    supabase
      .from("departments")
      .select("department_id", { count: "exact", head: true }),
    supabase
      .from("departments")
      .select("department_id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("questionnaires")
      .select("questionnaire_id", { count: "exact", head: true }),
    (() => {
      let query = supabase
        .from("weekly_monitoring")
        .select("student_id, created_at, mfbi_results(burnout_risk_level)")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (term?.term_id) {
        query = query.eq("term_id", term.term_id);
      }
      return query;
    })(),
  ]);

  const latestByStudent = new Map<string, string>();
  for (const row of mfbiRows ?? []) {
    if (latestByStudent.has(row.student_id)) continue;
    const mfbi = Array.isArray(row.mfbi_results)
      ? row.mfbi_results[0]
      : row.mfbi_results;
    if (mfbi?.burnout_risk_level) {
      latestByStudent.set(row.student_id, mfbi.burnout_risk_level);
    }
  }

  const highRiskCount = [...latestByStudent.values()].filter(
    (level) => level === "High" || level === "Severe"
  ).length;

  return {
    instructorCount: instructorCount ?? 0,
    studentCount: studentCount ?? 0,
    departmentCount: departmentCount ?? 0,
    activeDeptCount: activeDeptCount ?? 0,
    questionnaireCount: questionnaireCount ?? 0,
    highRiskCount,
  };
}

export { buildFullName };
