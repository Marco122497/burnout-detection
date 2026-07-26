"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireTreasurer } from "@/lib/auth/session";

export type FinanceActionState = {
  error?: string;
  success?: string;
};

async function getIp() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null
  );
}

function revalidateFinance() {
  revalidatePath("/treasurer");
  revalidatePath("/treasurer/donations");
  revalidatePath("/treasurer/collections");
  revalidatePath("/treasurer/expenses");
  revalidatePath("/treasurer/budgets");
  revalidatePath("/treasurer/budgets/categories");
  revalidatePath("/treasurer/budgets/allocation");
  revalidatePath("/treasurer/budgets/monitoring");
  revalidatePath("/treasurer/budgets/history");
  revalidatePath("/treasurer/reports");
  revalidatePath("/administrator/finance");
  revalidatePath("/administrator");
  revalidatePath("/administrator/reports");
  revalidatePath("/parish-officer/budget");
  revalidatePath("/");
}

async function logBudgetHistory(
  supabase: Awaited<ReturnType<typeof requireTreasurer>>["supabase"],
  userId: string,
  entry: {
    budget_id: number | null;
    budget_category_id: number | null;
    category_name: string | null;
    fiscal_year: number | null;
    previous_amount: number | null;
    new_amount: number | null;
    action: string;
    remarks: string | null;
  }
) {
  await supabase.from("budget_history").insert({
    ...entry,
    changed_by: userId,
  });
}

async function resolveBudgetCategoryName(
  supabase: Awaited<ReturnType<typeof requireTreasurer>>["supabase"],
  budgetCategoryId: number
) {
  const { data } = await supabase
    .from("budget_categories")
    .select("category_name")
    .eq("budget_category_id", budgetCategoryId)
    .maybeSingle();
  return data?.category_name ?? null;
}

function parseAmount(value: FormDataEntryValue | null) {
  const amount = Number(String(value || "").trim());
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return amount;
}

async function uploadReceipt(
  supabase: Awaited<ReturnType<typeof requireTreasurer>>["supabase"],
  userId: string,
  file: FormDataEntryValue | null
) {
  if (!(file instanceof File) || file.size === 0) {
    return { url: null as string | null, error: null as string | null };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: "Receipt must be 5MB or smaller." };
  }

  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
  ];
  if (!allowed.includes(file.type)) {
    return {
      url: null,
      error: "Receipt must be JPEG, PNG, WebP, GIF, or PDF.",
    };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("receipts").getPublicUrl(path);

  return { url: publicUrl, error: null };
}

export async function createDonation(
  _prev: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const { supabase, user } = await requireTreasurer();

  const donor_name = String(formData.get("donor_name") || "").trim() || null;
  const category_id = Number(formData.get("category_id"));
  const amount = parseAmount(formData.get("amount"));
  const donation_date = String(formData.get("donation_date") || "").trim();
  const remarks = String(formData.get("remarks") || "").trim() || null;

  if (!category_id || !amount || !donation_date) {
    return { error: "Category, amount, and date are required." };
  }

  const { data, error } = await supabase
    .from("donations")
    .insert({
      donor_name,
      category_id,
      amount,
      donation_date,
      remarks,
      created_by: user.id,
    })
    .select("donation_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "CREATE_DONATION",
    table_name: "donations",
    record_id: data.donation_id,
    description: `Created donation of ${amount}`,
    ip_address: await getIp(),
  });

  revalidateFinance();
  return { success: "Donation recorded." };
}

export async function updateDonation(
  _prev: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const { supabase, user } = await requireTreasurer();

  const donation_id = Number(formData.get("donation_id"));
  const donor_name = String(formData.get("donor_name") || "").trim() || null;
  const category_id = Number(formData.get("category_id"));
  const amount = parseAmount(formData.get("amount"));
  const donation_date = String(formData.get("donation_date") || "").trim();
  const remarks = String(formData.get("remarks") || "").trim() || null;

  if (!donation_id || !category_id || !amount || !donation_date) {
    return { error: "Category, amount, and date are required." };
  }

  const { error } = await supabase
    .from("donations")
    .update({
      donor_name,
      category_id,
      amount,
      donation_date,
      remarks,
    })
    .eq("donation_id", donation_id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "UPDATE_DONATION",
    table_name: "donations",
    record_id: donation_id,
    description: `Updated donation #${donation_id}`,
    ip_address: await getIp(),
  });

  revalidateFinance();
  return { success: "Donation updated." };
}

export async function deleteDonation(
  _prev: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const { supabase, user } = await requireTreasurer();
  const donation_id = Number(formData.get("donation_id"));

  if (!donation_id) {
    return { error: "Invalid donation." };
  }

  const { error } = await supabase
    .from("donations")
    .delete()
    .eq("donation_id", donation_id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "DELETE_DONATION",
    table_name: "donations",
    record_id: donation_id,
    description: `Deleted donation #${donation_id}`,
    ip_address: await getIp(),
  });

  revalidateFinance();
  return { success: "Donation deleted." };
}

export async function createExpense(
  _prev: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const { supabase, user } = await requireTreasurer();

  const expense_category_id = Number(formData.get("expense_category_id"));
  const description = String(formData.get("description") || "").trim() || null;
  const amount = parseAmount(formData.get("amount"));
  const expense_date = String(formData.get("expense_date") || "").trim();

  if (!expense_category_id || !amount || !expense_date) {
    return { error: "Category, amount, and date are required." };
  }

  const receipt = await uploadReceipt(
    supabase,
    user.id,
    formData.get("receipt")
  );
  if (receipt.error) {
    return { error: receipt.error };
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      expense_category_id,
      description,
      amount,
      expense_date,
      receipt_url: receipt.url,
      created_by: user.id,
    })
    .select("expense_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "CREATE_EXPENSE",
    table_name: "expenses",
    record_id: data.expense_id,
    description: `Created expense of ${amount}`,
    ip_address: await getIp(),
  });

  revalidateFinance();
  return { success: "Expense recorded." };
}

export async function updateExpense(
  _prev: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const { supabase, user } = await requireTreasurer();

  const expense_id = Number(formData.get("expense_id"));
  const expense_category_id = Number(formData.get("expense_category_id"));
  const description = String(formData.get("description") || "").trim() || null;
  const amount = parseAmount(formData.get("amount"));
  const expense_date = String(formData.get("expense_date") || "").trim();
  const existingReceipt =
    String(formData.get("existing_receipt_url") || "").trim() || null;

  if (!expense_id || !expense_category_id || !amount || !expense_date) {
    return { error: "Category, amount, and date are required." };
  }

  const receipt = await uploadReceipt(
    supabase,
    user.id,
    formData.get("receipt")
  );
  if (receipt.error) {
    return { error: receipt.error };
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      expense_category_id,
      description,
      amount,
      expense_date,
      receipt_url: receipt.url ?? existingReceipt,
    })
    .eq("expense_id", expense_id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "UPDATE_EXPENSE",
    table_name: "expenses",
    record_id: expense_id,
    description: `Updated expense #${expense_id}`,
    ip_address: await getIp(),
  });

  revalidateFinance();
  return { success: "Expense updated." };
}

export async function deleteExpense(
  _prev: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const { supabase, user } = await requireTreasurer();
  const expense_id = Number(formData.get("expense_id"));

  if (!expense_id) {
    return { error: "Invalid expense." };
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("expense_id", expense_id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "DELETE_EXPENSE",
    table_name: "expenses",
    record_id: expense_id,
    description: `Deleted expense #${expense_id}`,
    ip_address: await getIp(),
  });

  revalidateFinance();
  return { success: "Expense deleted." };
}

export async function createBudget(
  _prev: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const { supabase, user } = await requireTreasurer();

  const budget_category_id = Number(formData.get("budget_category_id"));
  const fiscal_year = Number(formData.get("fiscal_year"));
  const allocated_amount = parseAmount(formData.get("allocated_amount"));
  const remarks = String(formData.get("remarks") || "").trim() || null;

  if (!budget_category_id || !fiscal_year || !allocated_amount) {
    return { error: "Category, fiscal year, and amount are required." };
  }

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      budget_category_id,
      fiscal_year,
      allocated_amount,
      remarks,
      created_by: user.id,
    })
    .select("budget_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  const categoryName = await resolveBudgetCategoryName(
    supabase,
    budget_category_id
  );

  await logBudgetHistory(supabase, user.id, {
    budget_id: data.budget_id,
    budget_category_id,
    category_name: categoryName,
    fiscal_year,
    previous_amount: null,
    new_amount: allocated_amount,
    action: "CREATE",
    remarks,
  });

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "CREATE_BUDGET",
    table_name: "budgets",
    record_id: data.budget_id,
    description: `Created budget of ${allocated_amount} for ${fiscal_year}`,
    ip_address: await getIp(),
  });

  revalidateFinance();
  return { success: "Budget created." };
}

export async function updateBudget(
  _prev: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const { supabase, user } = await requireTreasurer();

  const budget_id = Number(formData.get("budget_id"));
  const budget_category_id = Number(formData.get("budget_category_id"));
  const fiscal_year = Number(formData.get("fiscal_year"));
  const allocated_amount = parseAmount(formData.get("allocated_amount"));
  const remarks = String(formData.get("remarks") || "").trim() || null;

  if (!budget_id || !budget_category_id || !fiscal_year || !allocated_amount) {
    return { error: "Category, fiscal year, and amount are required." };
  }

  const { data: existing } = await supabase
    .from("budgets")
    .select("allocated_amount, remarks")
    .eq("budget_id", budget_id)
    .maybeSingle();

  const { error } = await supabase
    .from("budgets")
    .update({
      budget_category_id,
      fiscal_year,
      allocated_amount,
      remarks,
    })
    .eq("budget_id", budget_id);

  if (error) {
    return { error: error.message };
  }

  const categoryName = await resolveBudgetCategoryName(
    supabase,
    budget_category_id
  );

  await logBudgetHistory(supabase, user.id, {
    budget_id,
    budget_category_id,
    category_name: categoryName,
    fiscal_year,
    previous_amount: existing ? Number(existing.allocated_amount) : null,
    new_amount: allocated_amount,
    action: "UPDATE",
    remarks,
  });

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "UPDATE_BUDGET",
    table_name: "budgets",
    record_id: budget_id,
    description: `Updated budget #${budget_id}`,
    ip_address: await getIp(),
  });

  revalidateFinance();
  return { success: "Budget updated." };
}

export async function deleteBudget(
  _prev: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const { supabase, user } = await requireTreasurer();
  const budget_id = Number(formData.get("budget_id"));

  if (!budget_id) {
    return { error: "Invalid budget." };
  }

  const { data: existing } = await supabase
    .from("budgets")
    .select(
      "allocated_amount, fiscal_year, budget_category_id, remarks, budget_categories(category_name)"
    )
    .eq("budget_id", budget_id)
    .maybeSingle();

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("budget_id", budget_id);

  if (error) {
    return { error: error.message };
  }

  const related = existing?.budget_categories as
    | { category_name?: string }
    | { category_name?: string }[]
    | null
    | undefined;
  const categoryName = Array.isArray(related)
    ? related[0]?.category_name
    : related?.category_name;

  await logBudgetHistory(supabase, user.id, {
    budget_id,
    budget_category_id: existing?.budget_category_id ?? null,
    category_name: categoryName ?? null,
    fiscal_year: existing?.fiscal_year ?? null,
    previous_amount: existing ? Number(existing.allocated_amount) : null,
    new_amount: null,
    action: "DELETE",
    remarks: existing?.remarks ?? null,
  });

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "DELETE_BUDGET",
    table_name: "budgets",
    record_id: budget_id,
    description: `Deleted budget #${budget_id}`,
    ip_address: await getIp(),
  });

  revalidateFinance();
  return { success: "Budget deleted." };
}
