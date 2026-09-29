"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import type { Profile } from "@/lib/auth/roles";
import {
  getDashboardPath,
  isGuidanceRole,
  isStudentRole,
} from "@/lib/auth/roles";
import { AppSidebar } from "@/components/app-sidebar";
import { ChumTheme } from "@/components/chum-theme";
import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { AppPageSkeleton } from "@/components/layout/app-page-skeleton";
import {
  isMonitoringShellPath,
  NavigationPendingProvider,
  useNavigationPending,
} from "@/components/layout/navigation-pending";
import {
  NavNotifications,
  type NavNotification,
} from "@/components/layout/nav-notifications";
import { NavUser } from "@/components/layout/nav-user";
import { StudentBottomNav } from "@/components/student/student-bottom-nav";
import { TopProgressBar } from "@/components/layout/top-progress-bar";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function AppShellContent({
  profile,
  email,
  notifications,
  children,
}: {
  profile: Profile;
  email: string | null;
  notifications: NavNotification[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const dashboardHref = getDashboardPath(profile.role);
  const { isPending, isBusy, pendingHref } = useNavigationPending();
  const { isMobile, setOpenMobile } = useSidebar();
  const isStudent = isStudentRole(profile.role);
  const viewAllHref = isStudent
    ? "/student/notifications"
    : profile.role === "Instructor"
      ? "/instructor/notifications"
      : isGuidanceRole(profile.role)
        ? "/guidance/notifications"
        : null;
  const isMonitoringShell = isMonitoringShellPath(pathname);
  const preserveMonitoringShell =
    isPending &&
    Boolean(pendingHref) &&
    isMonitoringShell &&
    isMonitoringShellPath(pendingHref!);
  const lockChrome = isBusy && !preserveMonitoringShell;

  useEffect(() => {
    if (!lockChrome) return;
    setOpenMobile(false);
  }, [lockChrome, setOpenMobile]);

  useEffect(() => {
    if (lockChrome) {
      document.body.dataset.appBusy = "true";
    } else {
      delete document.body.dataset.appBusy;
    }
    return () => {
      delete document.body.dataset.appBusy;
    };
  }, [lockChrome]);

  return (
    <>
      <TopProgressBar show={lockChrome} />
      {isStudent && isMobile ? null : <AppSidebar profile={profile} />}
      <SidebarInset
        className={cn(
          "min-h-0 overflow-hidden",
          isMonitoringShell && "md:mr-0 md:rounded-none md:shadow-none"
        )}
      >
        <header
          data-slot="app-topbar"
          className={cn(
            "flex h-14 shrink-0 items-center justify-between gap-2 border-b",
            isMonitoringShell ? "pr-2 pl-3" : "px-3"
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {isStudent ? (
              <SidebarTrigger
                disabled={lockChrome}
                className="hidden md:inline-flex"
              />
            ) : (
              <SidebarTrigger disabled={lockChrome} />
            )}
            {isStudent ? (
              <Separator
                orientation="vertical"
                className="mr-1 hidden data-vertical:h-4 data-vertical:self-auto md:block"
              />
            ) : (
              <Separator
                orientation="vertical"
                className="mr-1 data-vertical:h-4 data-vertical:self-auto"
              />
            )}
            <AppBreadcrumb dashboardHref={dashboardHref} />
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle disabled={lockChrome} />
            <NavNotifications
              notifications={notifications}
              viewAllHref={viewAllHref}
            />
            <NavUser profile={profile} email={email} />
          </div>
        </header>
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col gap-4",
            isMonitoringShell
              ? "overflow-hidden pt-4 pr-0 pb-0 pl-4 md:pt-6 md:pl-6"
              : cn(
                  "overflow-x-hidden overflow-y-auto p-4 md:p-6",
                  isStudent && "pb-24 md:pb-6"
                )
          )}
        >
          {isPending && !preserveMonitoringShell ? (
            <AppPageSkeleton href={pendingHref} />
          ) : (
            children
          )}
        </div>
        {isStudent ? <StudentBottomNav profile={profile} /> : null}
      </SidebarInset>
    </>
  );
}

export function AppShell({
  profile,
  email,
  notifications = [],
  children,
}: {
  profile: Profile;
  email: string | null;
  notifications?: NavNotification[];
  children: React.ReactNode;
}) {
  return (
    <ChumTheme className="h-svh overflow-hidden">
      <SidebarProvider className="h-svh min-h-0 overflow-hidden">
        <NavigationPendingProvider>
          <AppShellContent
            profile={profile}
            email={email}
            notifications={notifications}
          >
            {children}
          </AppShellContent>
        </NavigationPendingProvider>
      </SidebarProvider>
    </ChumTheme>
  );
}
