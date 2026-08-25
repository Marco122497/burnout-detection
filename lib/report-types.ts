export const GUIDANCE_REPORT_TYPES = [
  {
    id: "institutional",
    label: "Institutional Burnout Summary",
  },
  {
    id: "department",
    label: "Burnout by Department",
  },
  {
    id: "factors",
    label: "Burnout Factors",
  },
  {
    id: "intervention",
    label: "Intervention & Follow-up",
  },
] as const;

export type GuidanceReportType = (typeof GUIDANCE_REPORT_TYPES)[number]["id"];

export function isGuidanceReportType(
  value: string | undefined
): value is GuidanceReportType {
  return GUIDANCE_REPORT_TYPES.some((item) => item.id === value);
}

export const INSTRUCTOR_REPORT_TYPES = [
  { id: "summary", label: "Department Burnout Summary" },
  { id: "trend", label: "Burnout Trend" },
  { id: "at-risk", label: "Students at Risk" },
] as const;

export type InstructorReportType =
  (typeof INSTRUCTOR_REPORT_TYPES)[number]["id"];

export function isInstructorReportType(
  value: string | undefined
): value is InstructorReportType {
  return INSTRUCTOR_REPORT_TYPES.some((item) => item.id === value);
}
