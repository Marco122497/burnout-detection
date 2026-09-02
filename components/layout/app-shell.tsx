"use client";

import type { Profile } from "@/lib/auth/roles";
import {
  getDashboardPath,
  isGuidanceRole,
  isStudentRole,
} from "@/lib/auth/roles";
import { AppSidebar } from "@/components/app-sidebar";
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
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
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
  const { isPending, pendingHref } = useNavigationPending();
  const viewAllHref = isStudentRole(profile.role)
    ? "/student/notifications"
    : profile.role === "Instructor"
      ? "/instructor/notifications"
      : isGuidanceRole(profile.role)
        ? "/guidance/notifications"
        : null;

  return (
    <>
      <AppSidebar profile={profile} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/90 px-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-1 data-vertical:h-4 data-vertical:self-auto"
            />
            <AppBreadcrumb dashboardHref={dashboardHref} />
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
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
    <SidebarProvider>
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
  );
}
