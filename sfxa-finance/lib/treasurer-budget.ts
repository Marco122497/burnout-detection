export const BUDGET_TABS = [
  {
    href: "/treasurer/budgets/categories",
    label: "Budget Categories",
  },
  {
    href: "/treasurer/budgets/allocation",
    label: "Budget Allocation",
  },
  {
    href: "/treasurer/budgets/monitoring",
    label: "Budget Monitoring",
  },
  {
    href: "/treasurer/budgets/history",
    label: "Budget History",
  },
] as const;

export type BudgetTabHref = (typeof BUDGET_TABS)[number]["href"];

export function resolveBudgetTab(pathname: string): BudgetTabHref {
  const match = BUDGET_TABS.find(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)
  );
  return match?.href ?? BUDGET_TABS[1].href;
}
