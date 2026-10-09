import type { SupabaseClient } from "@supabase/supabase-js";

import {
  APP_COMPANY,
  APP_DEVELOPER,
  APP_DEVELOPER_ROLE,
} from "@/lib/app-meta";

export const DEVELOPER_PROFILE_SETTING_KEY = "developer_profile";

export const MAX_DEVELOPER_GMAILS = 8;
export const MAX_DEVELOPER_SOCIALS = 8;

export type DeveloperSocial = {
  label: string;
  url: string;
};

export type DeveloperProfile = {
  name: string;
  role: string;
  company: string;
  photo: string;
  gmails: string[];
  socials: DeveloperSocial[];
};

export const DEFAULT_DEVELOPER_PROFILE: DeveloperProfile = {
  name: APP_DEVELOPER,
  role: APP_DEVELOPER_ROLE,
  company: APP_COMPANY,
  photo: "",
  gmails: [],
  socials: [],
};

export function isDeveloperEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value);
}

function cleanText(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function parseDeveloperProfile(raw: string | null | undefined): DeveloperProfile {
  if (!raw?.trim()) return DEFAULT_DEVELOPER_PROFILE;

  try {
    const value = JSON.parse(raw) as Partial<DeveloperProfile> & {
      gmail?: string;
    };
    const storedGmails = Array.isArray(value.gmails)
      ? value.gmails
      : value.gmail
        ? [value.gmail]
        : [];
    const socials = Array.isArray(value.socials) ? value.socials : [];

    return {
      name: cleanText(value.name, 120) || DEFAULT_DEVELOPER_PROFILE.name,
      role: cleanText(value.role, 120) || DEFAULT_DEVELOPER_PROFILE.role,
      company: cleanText(value.company, 120) || DEFAULT_DEVELOPER_PROFILE.company,
      photo: cleanText(value.photo, 500),
      gmails: storedGmails
        .map((item) => cleanText(item, 120).toLowerCase())
        .filter((item) => isDeveloperEmail(item))
        .slice(0, MAX_DEVELOPER_GMAILS),
      socials: socials
        .map((item) => ({
          label: cleanText(item?.label, 40),
          url: cleanText(item?.url, 300),
        }))
        .filter((item) => item.label && /^https?:\/\//i.test(item.url))
        .slice(0, MAX_DEVELOPER_SOCIALS),
    };
  } catch {
    return DEFAULT_DEVELOPER_PROFILE;
  }
}

export async function getDeveloperProfile(
  supabase: SupabaseClient
): Promise<DeveloperProfile> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", DEVELOPER_PROFILE_SETTING_KEY)
      .maybeSingle();

    if (error || !data) return DEFAULT_DEVELOPER_PROFILE;
    return parseDeveloperProfile(String((data as { value?: string }).value ?? ""));
  } catch {
    return DEFAULT_DEVELOPER_PROFILE;
  }
}
