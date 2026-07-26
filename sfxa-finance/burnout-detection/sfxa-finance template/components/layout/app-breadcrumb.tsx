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
  const pageLabel = pageLabels[root] ?? dashboardLabels[root] ?? "Dashboard";

  if (isDashboard) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const dashboardLabel =
    dashboardLabels[dashboardHref.replace("/", "")] ?? "Dashboard";

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
          <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
