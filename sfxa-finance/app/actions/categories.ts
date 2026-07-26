"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireAdmin, requireRole } from "@/lib/auth/session";
import { isCollectionCategoryName } from "@/lib/categories";

export type CategoryActionState = {
  error?: string;
  success?: string;
};

export type CategoryKind = "donation" | "collection" | "expense" | "budget";

const KIND_CONFIG = {
  donation: {
    table: "donation_categories",
    idColumn: "category_id",
    label: "Donation type",
  },
  collection: {
    table: "donation_categories",
    idColumn: "category_id",
    label: "Collection type",
  },
  expense: {
    table: "expense_categories",
    idColumn: "expense_category_id",
    label: "Expense category",
  },
  budget: {
    table: "budget_categories",
    idColumn: "budget_category_id",
    label: "Budget category",
  },
} as const;

function isCategoryKind(value: string): value is CategoryKind {
  return (
    value === "donation" ||
    value === "collection" ||
    value === "expense" ||
    value === "budget"
  );
}

async function requireCategoryAccess(kind: CategoryKind) {
  if (kind === "budget" || kind === "donation") {
    return requireRole(["Administrator", "Treasurer"]);
  }
  return requireAdmin();
}

async function getIp() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null
  );
}

function revalidateCategories() {
  revalidatePath("/administrator/categories");
  revalidatePath("/administrator/categories/donations");
  revalidatePath("/administrator/categories/collections");
  revalidatePath("/administrator/categories/expenses");
  revalidatePath("/administrator/categories/budgets");
  revalidatePath("/treasurer/donations");
  revalidatePath("/treasurer/collections");
  revalidatePath("/treasurer/expenses");
  revalidatePath("/treasurer/budgets");
  revalidatePath("/treasurer/budgets/categories");
  revalidatePath("/treasurer/budgets/allocation");
  revalidatePath("/treasurer/budgets/monitoring");
  revalidatePath("/treasurer/budgets/history");
}

function validateCategoryName(kind: CategoryKind, category_name: string) {
  if (kind === "donation" && isCollectionCategoryName(category_name)) {
    return "Collection types belong under Collection categories. Use a donation type name instead.";
  }
  if (kind === "collection" && !isCollectionCategoryName(category_name)) {
    return 'Collection type names should include "Collection" (e.g. Youth Collection).';
  }
  return null;
}

export async function createCategory(
  _prev: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const kindRaw = String(formData.get("kind") || "");
  if (!isCategoryKind(kindRaw)) {
    return { error: "Invalid category type." };
  }

  const { supabase, user } = await requireCategoryAccess(kindRaw);
  const category_name = String(formData.get("category_name") || "").trim();

  if (!category_name) {
    return { error: "Category name is required." };
  }

  const nameError = validateCategoryName(kindRaw, category_name);
  if (nameError) {
    return { error: nameError };
  }

  const config = KIND_CONFIG[kindRaw];
  const { data, error } = await supabase
    .from(config.table)
    .insert({ category_name })
    .select(config.idColumn)
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "That category name already exists." };
    }
    return { error: error.message };
  }

  const recordId = Number(
    (data as Record<string, number | null>)[config.idColumn]
  );

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "CREATE_CATEGORY",
    table_name: config.table,
    record_id: recordId || null,
    description: `Created ${config.label}: ${category_name}`,
    ip_address: await getIp(),
  });

  revalidateCategories();
  return { success: `${config.label} added.` };
}

export async function updateCategory(
  _prev: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const kindRaw = String(formData.get("kind") || "");
  const categoryId = Number(formData.get("category_id"));
  const category_name = String(formData.get("category_name") || "").trim();

  if (!isCategoryKind(kindRaw) || !categoryId) {
    return { error: "Invalid category." };
  }

  const { supabase, user } = await requireCategoryAccess(kindRaw);

  if (!category_name) {
    return { error: "Category name is required." };
  }

  const nameError = validateCategoryName(kindRaw, category_name);
  if (nameError) {
    return { error: nameError };
  }

  const config = KIND_CONFIG[kindRaw];
  const { error } = await supabase
    .from(config.table)
    .update({ category_name })
    .eq(config.idColumn, categoryId);

  if (error) {
    if (error.code === "23505") {
      return { error: "That category name already exists." };
    }
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "UPDATE_CATEGORY",
    table_name: config.table,
    record_id: categoryId,
    description: `Updated ${config.label} #${categoryId} to ${category_name}`,
    ip_address: await getIp(),
  });

  revalidateCategories();
  return { success: `${config.label} updated.` };
}

export async function deleteCategory(
  _prev: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const kindRaw = String(formData.get("kind") || "");
  const categoryId = Number(formData.get("category_id"));

  if (!isCategoryKind(kindRaw) || !categoryId) {
    return { error: "Invalid category." };
  }

  const { supabase, user } = await requireCategoryAccess(kindRaw);
  const config = KIND_CONFIG[kindRaw];
  const { error } = await supabase
    .from(config.table)
    .delete()
    .eq(config.idColumn, categoryId);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Cannot delete this category because it is used by existing records.",
      };
    }
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "DELETE_CATEGORY",
    table_name: config.table,
    record_id: categoryId,
    description: `Deleted ${config.label} #${categoryId}`,
    ip_address: await getIp(),
  });

  revalidateCategories();
  return { success: `${config.label} deleted.` };
}
