"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import type { Profile } from "@/lib/auth/roles";
import { getDashboardPath } from "@/lib/auth/roles";
import { getNavItems } from "@/lib/auth/navigation";
import { useNavigationPending } from "@/components/layout/navigation-pending";
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
  useSidebar,
} from "@/components/ui/sidebar";

function getPrefetchUrls(home: string, urls: string[]) {
  return Array.from(new Set([home, "/profile", "/change-password", ...urls]));
}

function navGroup(pathname: string) {
  if (pathname.startsWith("/guidance/monitoring")) return "guidance-monitoring";
  if (pathname.startsWith("/instructor/monitoring")) {
    return "instructor-monitoring";
  }
  if (pathname.startsWith("/guidance/questionnaires")) {
    return "guidance-questionnaires";
  }
  return null;
}

function isSoftNavigation(from: string, to: string) {
  const fromGroup = navGroup(from);
  const toGroup = navGroup(to);
  return Boolean(fromGroup && toGroup && fromGroup === toGroup);
}

function isItemActive(pathname: string, itemUrl: string, home: string) {
  if (pathname === itemUrl) return true;
  if (itemUrl === home) return pathname === home;
  return (
    pathname.startsWith(`${itemUrl}/`) || pathname.startsWith(`${itemUrl}?`)
  );
}

export function AppSidebar({
  profile,
  ...props
}: React.ComponentProps<typeof Sidebar> & { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const { isPending, pendingHref, navigate } = useNavigationPending();
  const [isSoftPending, startSoftTransition] = useTransition();
  const [softPendingHref, setSoftPendingHref] = useState<string | null>(null);
  const home = getDashboardPath(profile.role);
  const navItems = getNavItems(profile.role, home);
  const isStudent = profile.role === "Student";

  useEffect(() => {
    const urls = getPrefetchUrls(
      home,
      getNavItems(profile.role, home).map((item) => item.url)
    );
    for (const url of urls) {
      router.prefetch(url);
    }
  }, [home, profile.role, router]);

  useEffect(() => {
    setSoftPendingHref(null);
  }, [pathname]);

  function onNavigate(url: string) {
    if (isItemActive(pathname, url, home) && pathname === url) return;

    if (isMobile) {
      setOpenMobile(false);
    }

    if (isSoftNavigation(pathname, url)) {
      setSoftPendingHref(url);
      startSoftTransition(() => {
        router.push(url);
      });
      return;
    }

    navigate(url);
  }

  const activePath = pendingHref ?? softPendingHref ?? pathname;

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => onNavigate(home)}>
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
              const isActive = isItemActive(activePath, item.url, home);
              const isLoading =
                (isPending &&
                  pendingHref !== null &&
                  isItemActive(pendingHref, item.url, home)) ||
                (isSoftPending && softPendingHref === item.url);

              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onMouseEnter={() => router.prefetch(item.url)}
                    onFocus={() => router.prefetch(item.url)}
                    onClick={() => onNavigate(item.url)}
                    className={isLoading ? "opacity-80" : undefined}
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <item.icon />
                    )}
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
