export const ROLES = [
  "Administrator",
  "Treasurer",
  "Parish Officer",
] as const;

export type UserRole = (typeof ROLES)[number];

export type Profile = {
  id: string;
  employee_no: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  full_name: string;
  sex: "Male" | "Female" | null;
  birth_date: string | null;
  contact_number: string | null;
  address: string | null;
  profile_picture: string | null;
  role: UserRole;
  status: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
};

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "Administrator":
      return "/administrator";
    case "Treasurer":
      return "/treasurer";
    case "Parish Officer":
      return "/parish-officer";
    default:
      return "/login";
  }
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

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
