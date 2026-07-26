"use client";

import type { Profile } from "@/lib/auth/roles";
import { getDashboardPath } from "@/lib/auth/roles";
import { AppSidebar } from "@/components/app-sidebar";
import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { AppPageSkeleton } from "@/components/layout/app-page-skeleton";
import {
  NavigationPendingProvider,
  useNavigationPending,
} from "@/components/layout/navigation-pending";
import { NavUser } from "@/components/layout/nav-user";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

function AppShellContent({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const dashboardHref = getDashboardPath(profile.role);
  const { isPending } = useNavigationPending();

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
          <NavUser profile={profile} />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {isPending ? <AppPageSkeleton /> : children}
        </div>
      </SidebarInset>
    </>
  );
}

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <NavigationPendingProvider>
        <AppShellContent profile={profile}>{children}</AppShellContent>
      </NavigationPendingProvider>
    </SidebarProvider>
  );
}
