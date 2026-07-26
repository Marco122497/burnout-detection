import { requireTreasurer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { relationName } from "@/lib/treasurer/relations";
import { TreasurerPageHeader } from "@/components/treasurer/treasurer-page-header";
import { ExpenseManager } from "@/components/treasurer/expense-manager";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default async function TreasurerExpensesPage() {
  await requireTreasurer();
  const supabase = await createClient();

  const [{ data: categories }, { data: expenses }] = await Promise.all([
    supabase
      .from("expense_categories")
      .select("expense_category_id, category_name")
      .order("category_name"),
    supabase
      .from("expenses")
      .select(
        "expense_id, expense_category_id, description, amount, expense_date, receipt_url, expense_categories(category_name)"
      )
      .order("expense_date", { ascending: false })
      .limit(200),
  ]);

  const rows = (expenses ?? []).map((row) => ({
    expense_id: row.expense_id,
    expense_category_id: row.expense_category_id,
    description: row.description,
    amount: row.amount,
    expense_date: row.expense_date,
    receipt_url: (row as { receipt_url?: string | null }).receipt_url ?? null,
    category_name: relationName(
      row.expense_categories as
        | { category_name?: string }
        | { category_name?: string }[]
        | null
    ),
  }));

  return (
    <div className="space-y-6">
      <TreasurerPageHeader
        title="Expense Management"
        description="Add, edit, search expenses and upload receipts."
      />
      <Card>
        <CardContent className="pt-6">
          <ExpenseManager expenses={rows} categories={categories ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
