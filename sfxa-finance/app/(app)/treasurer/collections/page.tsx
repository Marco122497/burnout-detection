import { requireTreasurer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { COLLECTION_CATEGORY_NAMES } from "@/lib/treasurer";
import { relationName } from "@/lib/treasurer/relations";
import { TreasurerPageHeader } from "@/components/treasurer/treasurer-page-header";
import { CollectionTypeSelect } from "@/components/treasurer/collection-type-select";
import { DonationManager } from "@/components/treasurer/donation-manager";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

function isCollectionType(
  value: string | undefined
): value is (typeof COLLECTION_CATEGORY_NAMES)[number] {
  return COLLECTION_CATEGORY_NAMES.some((name) => name === value);
}

export default async function TreasurerCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireTreasurer();
  const params = await searchParams;
  const collectionType = isCollectionType(params.type)
    ? params.type
    : "Sunday Collection";

  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("donation_categories")
    .select("category_id, category_name")
    .in("category_name", [...COLLECTION_CATEGORY_NAMES])
    .order("category_name");

  const activeCategory =
    (categories ?? []).find((c) => c.category_name === collectionType) ??
    (categories ?? [])[0];

  const { data: donations } = activeCategory
    ? await supabase
        .from("donations")
        .select(
          "donation_id, donor_name, category_id, amount, donation_date, remarks, donation_categories(category_name)"
        )
        .eq("category_id", activeCategory.category_id)
        .order("donation_date", { ascending: false })
        .limit(200)
    : { data: [] };

  const rows = (donations ?? []).map((row) => ({
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
        title="Collection Management"
        description="Manage Sunday, Special, Fiesta, and other parish collections."
        actions={<CollectionTypeSelect value={collectionType} />}
      />
      <Card>
        <CardContent className="pt-6">
          <DonationManager
            donations={rows}
            categories={categories ?? []}
            defaultCategoryId={activeCategory?.category_id}
            title={collectionType}
            emptyMessage={`No ${collectionType.toLowerCase()} entries yet.`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
