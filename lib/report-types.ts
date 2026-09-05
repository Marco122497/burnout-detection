export const GUIDANCE_REPORT_TYPES = [
  {
    id: "year-level",
    label: "Burnout by Department & Year Level",
  },
  {
    id: "institutional",
    label: "Institutional Summary by Department & Year Level",
  },
  {
    id: "department",
    label: "Department Comparison by Year Level",
  },
    {
      id: "gender",
      label: "Burnout & Factors by Gender",
    },
  {
    id: "factors",
    label: "Burnout Factors",
  },
  {
    id: "intervention",
    label: "Intervention & Follow-up by Department & Year Level",
  },
] as const;

export type GuidanceReportType = (typeof GUIDANCE_REPORT_TYPES)[number]["id"];

export function isGuidanceReportType(
  value: string | undefined
): value is GuidanceReportType {
  return GUIDANCE_REPORT_TYPES.some((item) => item.id === value);
}

export const INSTRUCTOR_REPORT_TYPES = [
  { id: "year-level", label: "Burnout Summary" },
  { id: "summary", label: "Department Summary" },
  { id: "gender", label: "Burnout & Factors by Gender" },
  { id: "trend", label: "Burnout Trend" },
  { id: "at-risk", label: "High-Risk Students" },
] as const;

export type InstructorReportType =
  (typeof INSTRUCTOR_REPORT_TYPES)[number]["id"];

export function isInstructorReportType(
  value: string | undefined
): value is InstructorReportType {
  return INSTRUCTOR_REPORT_TYPES.some((item) => item.id === value);
}
