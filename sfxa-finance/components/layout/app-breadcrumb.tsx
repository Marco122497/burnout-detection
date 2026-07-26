"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const pageLabels: Record<string, string> = {
  profile: "Profile",
  "change-password": "Change password",
  users: "Users",
  announcements: "Announcements",
  audit: "Audit Trail",
  reports: "Reports",
  finance: "Finance",
  donations: "Donations",
  collections: "Collections",
  expenses: "Expenses",
  budgets: "Budgets",
};

const dashboardLabels: Record<string, string> = {
  administrator: "Administrator Dashboard",
  treasurer: "Treasurer Dashboard",
  "parish-officer": "Parish Officer Dashboard",
};

export function AppBreadcrumb({ dashboardHref }: { dashboardHref: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const root = segments[0] ?? "";
  const isDashboard = pathname === dashboardHref;

  if (isDashboard) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{dashboardLabels[root] ?? "Dashboard"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const dashboardLabel =
    dashboardLabels[dashboardHref.replace("/", "")] ?? "Dashboard";
  const leaf = segments[segments.length - 1] ?? "";
  const pageLabel =
    pageLabels[leaf] ||
    pageLabels[segments[1] ?? ""] ||
    leaf.replace(/-/g, " ");

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink render={<Link href={dashboardHref} />}>
            {dashboardLabel}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage className="capitalize">{pageLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
