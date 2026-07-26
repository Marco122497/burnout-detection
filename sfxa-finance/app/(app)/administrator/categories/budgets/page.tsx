import { AdminCategoriesSection } from "@/components/administrator/admin-categories-section";

export default function AdminBudgetCategoriesPage() {
  return (
    <AdminCategoriesSection
      kind="budget"
      title="Budget Categories"
      description="Manage budget categories used for allocations and monitoring."
    />
  );
}
