import { requireTreasurer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isCollectionCategoryName } from "@/lib/categories";
import { relationName } from "@/lib/treasurer/relations";
import { TreasurerPageHeader } from "@/components/treasurer/treasurer-page-header";
import { DonationManager } from "@/components/treasurer/donation-manager";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default async function TreasurerDonationsPage() {
  await requireTreasurer();
  const supabase = await createClient();

  const [{ data: categories }, { data: donations }] = await Promise.all([
    supabase
      .from("donation_categories")
      .select("category_id, category_name")
      .order("category_name"),
    supabase
      .from("donations")
      .select(
        "donation_id, donor_name, category_id, amount, donation_date, remarks, donation_categories(category_name)"
      )
      .order("donation_date", { ascending: false })
      .limit(200),
  ]);

  const donationCategories = (categories ?? []).filter(
    (row) => !isCollectionCategoryName(row.category_name)
  );
  const donationCategoryIds = new Set(
    donationCategories.map((row) => row.category_id)
  );

  const rows = (donations ?? [])
    .filter(
      (row) =>
        row.category_id == null || donationCategoryIds.has(row.category_id)
    )
    .map((row) => ({
      donation_id: row.donation_id,
      donor_name: row.donor_name,
      category_id: row.category_id,
      amount: row.amount,
      donation_date: row.donation_date,
      remarks: row.remarks,
      category_name: relationName(
        row.donation_categories as
          | { category_name?: string }
          | { category_name?: string }[]
          | null
      ),
    }));

  return (
    <div className="space-y-6">
      <TreasurerPageHeader
        title="Donation Management"
        description="Add, edit, search, and review donation history."
      />
      <Card>
        <CardContent className="pt-6">
          <DonationManager
            donations={rows}
            categories={donationCategories}
            title="Donation history"
          />
        </CardContent>
      </Card>
    </div>
  );
}
