export const ROLES = [
  "Student",
  "Instructor",
  "Guidance Counselor",
] as const;

export type UserRole = (typeof ROLES)[number];

/** Public self-registration (students only). Instructors are created by Guidance. */
export const REGISTERABLE_ROLES = ["Student"] as const satisfies readonly UserRole[];

export type RegisterableRole = (typeof REGISTERABLE_ROLES)[number];

export type Department = {
  department_id: number;
  department_code: string;
  department_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  role: UserRole;
  employee_no: string | null;
  student_number: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  /** Computed client/server display name (not a DB column). */
  full_name: string;
  sex: "Male" | "Female" | null;
  birth_date: string | null;
  age: number | null;
  civil_status: string | null;
  contact_number: string | null;
  address: string | null;
  profile_picture: string | null;
  course: string | null;
  year_level: number | null;
  section: string | null;
  enrollment_status: string | null;
  designation: string | null;
  employment_status: string | null;
  department_id: number | null;
  is_active: boolean;
  is_verified: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = Omit<Profile, "full_name">;

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "Student":
      return "/student";
    case "Instructor":
      return "/instructor";
    case "Guidance Counselor":
      return "/guidance";
    default:
      return "/login";
  }
}

export function isStudentRole(role: UserRole): boolean {
  return role === "Student";
}

export function isGuidanceRole(role: UserRole): boolean {
  return role === "Guidance Counselor";
}

export function buildFullName(parts: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
}): string {
  return [parts.first_name, parts.middle_name, parts.last_name, parts.suffix]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toProfile(row: ProfileRow | Record<string, unknown>): Profile {
  const data = row as ProfileRow;
  return {
    ...data,
    full_name: buildFullName(data),
  };
}

export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
