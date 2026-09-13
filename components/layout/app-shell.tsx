"use client";

import { useEffect } from "react";

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
  NavigationPendingProvider,
  useNavigationPending,
} from "@/components/layout/navigation-pending";
import {
  NavNotifications,
  type NavNotification,
} from "@/components/layout/nav-notifications";
import { NavUser } from "@/components/layout/nav-user";
import { TopProgressBar } from "@/components/layout/top-progress-bar";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

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
  const dashboardHref = getDashboardPath(profile.role);
  const { isPending, isBusy, pendingHref } = useNavigationPending();
  const { setOpenMobile } = useSidebar();
  const viewAllHref = isStudentRole(profile.role)
    ? "/student/notifications"
    : profile.role === "Instructor"
      ? "/instructor/notifications"
      : isGuidanceRole(profile.role)
        ? "/guidance/notifications"
        : null;

  useEffect(() => {
    if (!isBusy) return;
    setOpenMobile(false);
  }, [isBusy, setOpenMobile]);

  useEffect(() => {
    if (isBusy) {
      document.body.dataset.appBusy = "true";
    } else {
      delete document.body.dataset.appBusy;
    }
    return () => {
      delete document.body.dataset.appBusy;
    };
  }, [isBusy]);

  return (
    <>
      <TopProgressBar show={isBusy} />
      <AppSidebar profile={profile} />
      <SidebarInset>
        <header
          data-slot="app-topbar"
          className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger disabled={isBusy} />
            <Separator
              orientation="vertical"
              className="mr-1 data-vertical:h-4 data-vertical:self-auto"
            />
            <AppBreadcrumb dashboardHref={dashboardHref} />
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle disabled={isBusy} />
            <NavNotifications
              notifications={notifications}
              viewAllHref={viewAllHref}
            />
            <NavUser profile={profile} email={email} />
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden p-4 md:p-6">
          {isPending ? <AppPageSkeleton href={pendingHref} /> : children}
        </div>
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
    <ChumTheme className="min-h-svh">
      <SidebarProvider className="min-h-svh">
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
