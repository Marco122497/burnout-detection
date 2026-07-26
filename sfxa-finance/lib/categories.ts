export const COLLECTION_CATEGORY_NAMES = [
  "Sunday Collection",
  "Special Collection",
  "Fiesta Collection",
  "Other Collection",
] as const;

export function isCollectionCategoryName(name: string | null | undefined) {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return (
    COLLECTION_CATEGORY_NAMES.some(
      (item) => item.toLowerCase() === normalized
    ) || normalized.includes("collection")
  );
}

export const CATEGORY_TABS = [
  {
    href: "/administrator/categories/donations",
    label: "Donation",
    kind: "donation" as const,
  },
  {
    href: "/administrator/categories/collections",
    label: "Collection",
    kind: "collection" as const,
  },
  {
    href: "/administrator/categories/expenses",
    label: "Expense",
    kind: "expense" as const,
  },
  {
    href: "/administrator/categories/budgets",
    label: "Budget",
    kind: "budget" as const,
  },
] as const;

export type CategoryTabHref = (typeof CATEGORY_TABS)[number]["href"];

export function resolveCategoryTab(pathname: string): CategoryTabHref {
  const match = CATEGORY_TABS.find(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)
  );
  return match?.href ?? CATEGORY_TABS[0].href;
}
