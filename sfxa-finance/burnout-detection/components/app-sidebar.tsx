"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Profile } from "@/lib/auth/roles";
import { getDashboardPath } from "@/lib/auth/roles";
import { getNavItems } from "@/lib/auth/navigation";
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

export function AppSidebar({
  profile,
  ...props
}: React.ComponentProps<typeof Sidebar> & { profile: Profile }) {
  const pathname = usePathname();
  const home = getDashboardPath(profile.role);
  const navItems = getNavItems(profile.role, home);
  const isStudent = profile.role === "Student";

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={home} />}>
              <div className="flex aspect-square size-10 items-center justify-center overflow-hidden rounded-lg">
                <img
                  src="/logo.png"
                  alt="Burnout Monitor"
                  width={48}
                  height={48}
                  className="size-12 object-contain"
                />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Burnout Detection System</span>
                <span className="text-xs text-muted-foreground">
                  v.1.1.1.0 (Beta)
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isStudent ? "Student menu" : "Menu"}
          </SidebarGroupLabel>
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
