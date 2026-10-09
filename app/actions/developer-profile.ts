"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { toAuditLogRow } from "@/lib/audit";
import {
  DEVELOPER_PROFILE_SETTING_KEY,
  MAX_DEVELOPER_GMAILS,
  MAX_DEVELOPER_SOCIALS,
  isDeveloperEmail,
  type DeveloperProfile,
  type DeveloperSocial,
  getDeveloperProfile,
} from "@/lib/developer-profile";
import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { requireRole } from "@/lib/auth/session";

export type DeveloperProfileActionState = {
  error?: string;
  success?: string;
  profile?: DeveloperProfile;
};

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function readGmails(formData: FormData): string[] | { error: string } {
  const gmails: string[] = [];

  for (const entry of formData.getAll("developer_gmail")) {
    const gmail = clean(entry, 120).toLowerCase();
    if (!gmail) continue;
    if (!isDeveloperEmail(gmail)) {
      return { error: "Each email must look like name@example.com." };
    }
    if (!gmails.includes(gmail)) gmails.push(gmail);
  }

  if (gmails.length > MAX_DEVELOPER_GMAILS) {
    return { error: `You can add up to ${MAX_DEVELOPER_GMAILS} email accounts.` };
  }

  return gmails;
}

function readSocials(formData: FormData): DeveloperSocial[] | { error: string } {
  const labels = formData.getAll("social_label");
  const urls = formData.getAll("social_url");
  const count = Math.max(labels.length, urls.length);
  const socials: DeveloperSocial[] = [];

  for (let index = 0; index < count; index += 1) {
    const label = clean(labels[index] ?? null, 40);
    const url = clean(urls[index] ?? null, 300);
    if (!label && !url) continue;
    if (!label || !url) {
      return { error: "Each social account needs a name and a link." };
    }
    if (!/^https?:\/\//i.test(url)) {
      return { error: "Social links must start with http:// or https://." };
    }
    socials.push({ label, url });
  }

  if (socials.length > MAX_DEVELOPER_SOCIALS) {
    return { error: `You can add up to ${MAX_DEVELOPER_SOCIALS} social accounts.` };
  }

  return socials;
}

export async function updateDeveloperProfile(
  _prev: DeveloperProfileActionState,
  formData: FormData
): Promise<DeveloperProfileActionState> {
  try {
    const { supabase, user, profile } = await requireRole(["Guidance Counselor"]);

    if (!isSuperadminEmail(user.email)) {
      return {
        error: "Only superadmin@school.edu can edit developer info.",
      };
    }

    const name = clean(formData.get("developer_name"), 120);
    const role = clean(formData.get("developer_role"), 120);
    const company = clean(formData.get("developer_company"), 120);

    if (!name) return { error: "Enter the developer name." };
    if (!role) return { error: "Enter the work title." };
    if (!company) return { error: "Enter the organization." };

    const gmails = readGmails(formData);
    if (!Array.isArray(gmails)) return gmails;

    const socials = readSocials(formData);
    if (!Array.isArray(socials)) return socials;

    const existing = await getDeveloperProfile(supabase);
    let photo = existing.photo;
    const removePhoto = formData.get("remove_photo") === "1";
    const file = formData.get("developer_photo");

    if (file instanceof File && file.size > 0) {
      if (file.size > 2 * 1024 * 1024) {
        return { error: "Image must be 2MB or smaller." };
      }

      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) {
        return { error: "Only JPEG, PNG, WebP, or GIF images are allowed." };
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/developer.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) return { error: uploadError.message };

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      photo = `${publicUrl}?v=${Date.now()}`;
    } else if (removePhoto) {
      photo = "";
    }

    const next: DeveloperProfile = { name, role, company, photo, gmails, socials };

    const { error } = await supabase.from("app_settings").upsert(
      {
        key: DEVELOPER_PROFILE_SETTING_KEY,
        value: JSON.stringify(next),
        updated_by: user.id,
      },
      { onConflict: "key" }
    );

    if (error) {
      return {
        error:
          error.message.includes("app_settings") ||
          error.code === "42P01" ||
          error.message.toLowerCase().includes("does not exist")
            ? "App settings table is missing. Run supabase/phase11-app-settings.sql first."
            : error.message,
      };
    }

    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      null;

    try {
      await supabase.from("audit_logs").insert(
        toAuditLogRow({
          user_id: user.id,
          user_role: profile.role,
          action: "UPDATE_DEVELOPER_PROFILE",
          action_type: "UPDATE",
          table_name: "app_settings",
          record_id: DEVELOPER_PROFILE_SETTING_KEY,
          description: `Updated developer info for "${name}"`,
          ip_address: ip,
        })
      );
    } catch {
      // Audit is best-effort.
    }

    revalidatePath("/", "layout");

    return { success: "Developer info saved.", profile: next };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to save developer info.",
    };
  }
}
