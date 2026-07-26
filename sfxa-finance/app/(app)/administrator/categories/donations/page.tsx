import { AdminCategoriesSection } from "@/components/administrator/admin-categories-section";

export default function AdminDonationCategoriesPage() {
  return (
    <AdminCategoriesSection
      kind="donation"
      title="Donation Categories"
      description="Manage donation types used in Treasurer donation records. Collection types are managed separately."
    />
  );
}
