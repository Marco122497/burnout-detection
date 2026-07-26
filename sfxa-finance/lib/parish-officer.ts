export const PARISH_REPORT_TABS = [
  { href: "/parish-officer/reports/income", label: "Income Report" },
  { href: "/parish-officer/reports/expenses", label: "Expense Report" },
  { href: "/parish-officer/reports/budget", label: "Budget Report" },
  {
    href: "/parish-officer/reports/collections",
    label: "Collection Summary",
  },
] as const;

export type ParishReportTabHref = (typeof PARISH_REPORT_TABS)[number]["href"];

export function resolveParishReportTab(pathname: string): ParishReportTabHref {
  const match = PARISH_REPORT_TABS.find(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)
  );
  return match?.href ?? PARISH_REPORT_TABS[0].href;
}
