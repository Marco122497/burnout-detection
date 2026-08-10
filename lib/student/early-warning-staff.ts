import {
  parseEarlyWarningRemarks,
  type EarlyWarningPayload,
} from "@/lib/student/ai-client";

export type StaffEarlyWarningFields = {
  early_warning_attention: boolean;
  next_week_risk: string | null;
  week2_risk: string | null;
  early_warning_trend: string | null;
  has_ml_next_week: boolean;
};

export function staffEarlyWarningFromRemarks(
  remarks: string | null | undefined
): StaffEarlyWarningFields {
  const early = parseEarlyWarningRemarks(remarks);
  return staffEarlyWarningFromPayload(early);
}

export function staffEarlyWarningFromPayload(
  early: EarlyWarningPayload | null
): StaffEarlyWarningFields {
  if (!early) {
    return {
      early_warning_attention: false,
      next_week_risk: null,
      week2_risk: null,
      early_warning_trend: null,
      has_ml_next_week: false,
    };
  }

  const early_warning_attention = Boolean(
    early.next_week_risk === "High" ||
      early.week2_risk === "High" ||
      early.trend === "increasing"
  );

  return {
    early_warning_attention,
    next_week_risk: early.next_week_risk,
    week2_risk: early.week2_risk,
    early_warning_trend: early.trend,
    has_ml_next_week: early.has_ml_next_week,
  };
}

export type EarlyWarningStudentSummary = {
  id: string;
  full_name: string;
  student_number: string | null;
  course: string | null;
  year_level: number | null;
  mfbi_score: number | null;
  current_risk: string;
  next_week_risk: string | null;
  week2_risk: string | null;
  trend: string | null;
};
