export const FINANCE_TABS = [
  { href: "/administrator/finance/donations", label: "Donations" },
  { href: "/administrator/finance/collections", label: "Collections" },
  { href: "/administrator/finance/expenses", label: "Expenses" },
  { href: "/administrator/finance/budgets", label: "Budget Allocation" },
] as const;

export type FinanceTabHref = (typeof FINANCE_TABS)[number]["href"];

export function resolveFinanceTab(pathname: string): FinanceTabHref {
  const match = FINANCE_TABS.find(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)
  );
  return match?.href ?? FINANCE_TABS[0].href;
}
