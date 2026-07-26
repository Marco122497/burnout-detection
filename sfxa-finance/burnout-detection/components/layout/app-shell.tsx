"use client";

import type { Profile } from "@/lib/auth/roles";
import { getDashboardPath } from "@/lib/auth/roles";
import { AppSidebar } from "@/components/app-sidebar";
import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { NavUser } from "@/components/layout/nav-user";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const dashboardHref = getDashboardPath(profile.role);

  return (
    <SidebarProvider>
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
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
