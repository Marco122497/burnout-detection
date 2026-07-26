"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChurchIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  UserRoundIcon,
} from "lucide-react";

import type { Profile, UserRole } from "@/lib/auth/roles";
import { getDashboardPath } from "@/lib/auth/roles";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

function getNavItems(role: UserRole, home: string): NavItem[] {
  const items: NavItem[] = [
    { title: "Dashboard", url: home, icon: LayoutDashboardIcon },
    { title: "Profile", url: "/profile", icon: UserRoundIcon },
    { title: "Change password", url: "/change-password", icon: KeyRoundIcon },
  ];

  if (role === "Administrator") {
    // Phase 2 modules will extend this group.
  }

  return items;
}

export function AppSidebar({
  profile,
  ...props
}: React.ComponentProps<typeof Sidebar> & { profile: Profile }) {
  const pathname = usePathname();
  const home = getDashboardPath(profile.role);
  const navItems = getNavItems(profile.role, home);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={home} />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <ChurchIcon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">SFXA Finance</span>
                <span className="text-xs text-muted-foreground">{profile.role}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive =
                pathname === item.url ||
                (item.url !== home && pathname.startsWith(`${item.url}/`));

              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={isActive}
                    render={<Link href={item.url} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
