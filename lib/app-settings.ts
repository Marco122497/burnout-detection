import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_SCHOOL_ADMINISTRATOR_NAME =
  "SR. LEONILA M. SAJELAN, MCM";
export const DEFAULT_SCHOOL_ADMINISTRATOR_TITLE = "School Vice-President";

export const APP_SETTING_KEYS = {
  schoolAdministratorName: "school_administrator_name",
  schoolAdministratorTitle: "school_administrator_title",
  openaiLlmEnabled: "openai_llm_enabled",
} as const;

export type SchoolAdministratorSignatory = {
  name: string;
  title: string;
};

function normalizeSignatory(
  name: string | null | undefined,
  title: string | null | undefined
): SchoolAdministratorSignatory {
  const resolvedName =
    name?.trim() || DEFAULT_SCHOOL_ADMINISTRATOR_NAME;
  const resolvedTitle =
    title?.trim() || resolvedName || DEFAULT_SCHOOL_ADMINISTRATOR_TITLE;
  return { name: resolvedName, title: resolvedTitle };
}

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
