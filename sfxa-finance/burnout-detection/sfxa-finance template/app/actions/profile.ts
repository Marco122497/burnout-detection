"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { buildFullName } from "@/lib/auth/roles";
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

  if (!first_name || !last_name) {
    return { error: "First name and last name are required." };
  }

  const sex =
    sexRaw === "Male" || sexRaw === "Female" ? sexRaw : null;

  const full_name = buildFullName({
    first_name,
    middle_name,
    last_name,
    suffix,
  });

  const { error } = await supabase
    .from("profiles")
    .update({
      employee_no,
      first_name,
      middle_name,
      last_name,
      suffix,
      full_name,
      sex,
      birth_date,
      contact_number,
      address,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Employee number is already in use." };
    }
    return { error: error.message };
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null;

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "UPDATE_PROFILE",
    table_name: "profiles",
    description: `Profile updated for ${profile.full_name}`,
    ip_address: ip,
  });

  revalidatePath("/profile");
  return { success: "Profile updated successfully." };
}

export async function uploadProfilePicture(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const { supabase, user } = await requireUser();
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

  // Bust browser cache after replace
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

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "UPDATE_PROFILE_PICTURE",
    table_name: "profiles",
    description: "Profile picture uploaded",
    ip_address: ip,
  });

  revalidatePath("/profile");
  return { success: "Profile picture updated." };
}
