import { AdminCategoriesSection } from "@/components/administrator/admin-categories-section";

export default function AdminExpenseCategoriesPage() {
  return (
    <AdminCategoriesSection
      kind="expense"
      title="Expense Categories"
      description="Manage expense categories used when recording parish expenses."
    />
  );
}
