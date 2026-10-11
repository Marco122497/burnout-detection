import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_SCHOOL_ADMINISTRATOR_NAME =
  "SR. LEONILA M. SAJELAN, MCM";
export const DEFAULT_SCHOOL_ADMINISTRATOR_TITLE = "School Vice-President";
export const DEFAULT_GUIDANCE_COUNSELOR_NAME = "Guidance Counselor";
export const DEFAULT_GUIDANCE_COUNSELOR_TITLE = "Guidance Counselor";

export const APP_SETTING_KEYS = {
  schoolAdministratorName: "school_administrator_name",
  schoolAdministratorTitle: "school_administrator_title",
  guidanceCounselorName: "guidance_counselor_name",
  guidanceCounselorTitle: "guidance_counselor_title",
  openaiLlmEnabled: "openai_llm_enabled",
  forgotPasswordEnabled: "forgot_password_enabled",
  otherAdminQuestionEdit: "other_admin_question_edit",
  otherAdminMonitoringControl: "other_admin_monitoring_control",
} as const;

export type SchoolAdministratorSignatory = {
  name: string;
  title: string;
};

function resolveSignatory(
  name: string | null | undefined,
  title: string | null | undefined,
  defaultName: string,
  defaultTitle: string
): SchoolAdministratorSignatory {
  const resolvedName = name?.trim() || defaultName;
  const resolvedTitle = title?.trim() || resolvedName || defaultTitle;
  return { name: resolvedName, title: resolvedTitle };
}

function normalizeSignatory(
  name: string | null | undefined,
  title: string | null | undefined
): SchoolAdministratorSignatory {
  return resolveSignatory(
    name,
    title,
    DEFAULT_SCHOOL_ADMINISTRATOR_NAME,
    DEFAULT_SCHOOL_ADMINISTRATOR_TITLE
  );
}

export type ReportSignatories = {
  schoolAdministrator: SchoolAdministratorSignatory;
  guidanceCounselor: SchoolAdministratorSignatory;
};

/** Loads the School Administrator signatory used on formal reports. */
export async function getSchoolAdministratorSignatory(
  supabase: SupabaseClient
): Promise<SchoolAdministratorSignatory> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [
        APP_SETTING_KEYS.schoolAdministratorName,
        APP_SETTING_KEYS.schoolAdministratorTitle,
      ]);

    if (error || !data) {
      return normalizeSignatory(null, null);
    }

    const map = new Map(
      data.map((row: { key: string; value: string }) => [row.key, row.value])
    );

    return normalizeSignatory(
      map.get(APP_SETTING_KEYS.schoolAdministratorName),
      map.get(APP_SETTING_KEYS.schoolAdministratorTitle)
    );
  } catch {
    return normalizeSignatory(null, null);
  }
}

/** Loads the Guidance Counselor and School Administrator lines used on reports. */
export async function getReportSignatories(
  supabase: SupabaseClient
): Promise<ReportSignatories> {
  const empty: ReportSignatories = {
    schoolAdministrator: normalizeSignatory(null, null),
    guidanceCounselor: resolveSignatory(
      null,
      null,
      DEFAULT_GUIDANCE_COUNSELOR_NAME,
      DEFAULT_GUIDANCE_COUNSELOR_TITLE
    ),
  };

  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [
        APP_SETTING_KEYS.schoolAdministratorName,
        APP_SETTING_KEYS.schoolAdministratorTitle,
        APP_SETTING_KEYS.guidanceCounselorName,
        APP_SETTING_KEYS.guidanceCounselorTitle,
      ]);

    if (error || !data) return empty;

    const map = new Map(
      data.map((row: { key: string; value: string }) => [row.key, row.value])
    );

    return {
      schoolAdministrator: normalizeSignatory(
        map.get(APP_SETTING_KEYS.schoolAdministratorName),
        map.get(APP_SETTING_KEYS.schoolAdministratorTitle)
      ),
      guidanceCounselor: resolveSignatory(
        map.get(APP_SETTING_KEYS.guidanceCounselorName),
        map.get(APP_SETTING_KEYS.guidanceCounselorTitle),
        DEFAULT_GUIDANCE_COUNSELOR_NAME,
        DEFAULT_GUIDANCE_COUNSELOR_TITLE
      ),
    };
  } catch {
    return empty;
  }
}

function parseEnabledFlag(value: string | null | undefined): boolean {
  const normalized = (value ?? "true").trim().toLowerCase();
  return !["0", "false", "off", "no"].includes(normalized);
}

/** When false, RAG still runs; OpenAI only writes wording when true. */
export async function getOpenaiLlmEnabled(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", APP_SETTING_KEYS.openaiLlmEnabled)
      .maybeSingle();

    if (error || !data) return true;
    return parseEnabledFlag(String((data as { value?: string }).value));
  } catch {
    return true;
  }
}

/**
 * When false, guidance accounts other than superadmin@school.edu can view
 * questions but cannot add, edit, delete, reorder, or change question numbers.
 */
export async function getOtherAdminCanEditQuestions(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", APP_SETTING_KEYS.otherAdminQuestionEdit)
      .maybeSingle();

    if (error || !data) return false;
    const normalized = String((data as { value?: string }).value ?? "")
      .trim()
      .toLowerCase();
    return ["1", "true", "on", "yes"].includes(normalized);
  } catch {
    return false;
  }
}

/**
 * When false, guidance accounts other than superadmin@school.edu do not see
 * the weekly monitoring control. Superadmin always sees it.
 * Missing key stays on, so existing schools keep the control visible.
 */
export async function getOtherAdminCanControlMonitoring(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", APP_SETTING_KEYS.otherAdminMonitoringControl)
      .maybeSingle();

    if (error || !data) return true;
    return parseEnabledFlag(String((data as { value?: string }).value));
  } catch {
    return true;
  }
}

/** When false, the login page hides Forgot password and reset emails are blocked. */
export async function getForgotPasswordEnabled(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", APP_SETTING_KEYS.forgotPasswordEnabled)
      .maybeSingle();

    if (error || !data) return true;
    return parseEnabledFlag(String((data as { value?: string }).value));
  } catch {
    return true;
  }
}
