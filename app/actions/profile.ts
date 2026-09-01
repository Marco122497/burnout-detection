"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { calculateAge, isStudentRole } from "@/lib/auth/roles";
import { toAuditLogRow } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";

export type ProfileActionState = {
  error?: string;
  success?: string;
};

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const { supabase, user, profile } = await requireUser();

  const first_name = String(formData.get("first_name") || "").trim();
  const middle_name = String(formData.get("middle_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim();
  const suffix = String(formData.get("suffix") || "").trim() || null;
  const sexRaw = String(formData.get("sex") || "").trim();
  const birth_date = String(formData.get("birth_date") || "").trim() || null;
  const contact_number =
    String(formData.get("contact_number") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  const employee_no = String(formData.get("employee_no") || "").trim() || null;
  const designation = String(formData.get("designation") || "").trim() || null;
  const departmentRaw = String(formData.get("department_id") || "").trim();
  const yearLevelRaw = String(formData.get("year_level") || "").trim();

  const sex = sexRaw === "Male" || sexRaw === "Female" ? sexRaw : null;
  const age = calculateAge(birth_date);

  if (isStudentRole(profile.role)) {
    const { error } = await supabase
      .from("profiles")
      .update({
        sex,
        birth_date,
        age,
        contact_number,
        address,
      })
      .eq("id", user.id);

    if (error) {
      return { error: error.message };
    }
  } else {
    if (!first_name || !last_name) {
      return { error: "First name and last name are required." };
    }

    const year_level = yearLevelRaw ? Number(yearLevelRaw) : null;
    const department_id = departmentRaw ? Number(departmentRaw) : null;

    if (
      year_level !== null &&
      (Number.isNaN(year_level) || year_level < 1 || year_level > 6)
    ) {
      return { error: "Year level must be between 1 and 6." };
    }

    const payload: Record<string, unknown> = {
      first_name,
      middle_name,
      last_name,
      suffix,
      sex,
      birth_date,
      age,
      contact_number,
      address,
      employee_no,
      designation,
    };

    if (profile.role === "Guidance Counselor" && department_id) {
      payload.department_id = department_id;
    }

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      if (error.code === "23505") {
        return { error: "Employee number is already in use." };
      }
      return { error: error.message };
    }
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null;

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "UPDATE_PROFILE",
      action_type: "UPDATE",
      table_name: "profiles",
      record_id: user.id,
      description: `Profile updated for ${profile.full_name}`,
      ip_address: ip,
    })
  );

  revalidatePath("/profile");
  return { success: "Profile updated successfully." };
}

export async function uploadProfilePicture(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const { supabase, user, profile } = await requireUser();
  const file = formData.get("profile_picture");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image to upload." };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: "Image must be 2MB or smaller." };
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { error: "Only JPEG, PNG, WebP, or GIF images are allowed." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const profilePictureUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ profile_picture: profilePictureUrl })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null;

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "UPDATE_PROFILE_PICTURE",
      action_type: "UPDATE",
      table_name: "profiles",
      record_id: user.id,
      description: "Profile picture uploaded",
      ip_address: ip,
    })
  );

  revalidatePath("/profile");
  return { success: "Profile picture updated." };
}
