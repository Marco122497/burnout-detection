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
  assessment: "Weekly Monitoring",
  monitoring: "Weekly Monitoring",
  burnout: "Assessment History",
  recommendations: "Recommendations",
  notifications: "Notifications",
  analytics: "Burnout Analytics",
  reports: "Reports",
  announcements: "Announcements",
  departments: "Departments",
  instructors: "Instructors",
  questionnaires: "Questionnaires",
};

const dashboardLabels: Record<string, string> = {
  student: "Student Dashboard",
  instructor: "Instructor Dashboard",
  guidance: "Guidance Counselor Dashboard",
};

export function AppBreadcrumb({ dashboardHref }: { dashboardHref: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const root = segments[0] ?? "";
  const leaf = segments[segments.length - 1] ?? "";
  const isDashboard = pathname === dashboardHref;

  if (isDashboard) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>
              {dashboardLabels[root] ?? "Dashboard"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const dashboardLabel =
    dashboardLabels[dashboardHref.replace("/", "")] ?? "Dashboard";

  let pageLabel =
    pageLabels[leaf] ??
    pageLabels[root] ??
    dashboardLabels[root] ??
    "Page";

  if (leaf === "monitoring" && root === "student") {
    pageLabel = "Weekly Monitoring";
  }

  if (
    segments[0] === "guidance" &&
    segments[1] === "questionnaires" &&
    segments.length > 2
  ) {
    pageLabel = "Questionnaire details";
  }

  if (
    (segments[0] === "guidance" || segments[0] === "instructor") &&
    segments[1] === "monitoring" &&
    segments.length > 2
  ) {
    pageLabel = "Student history";
  }

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
