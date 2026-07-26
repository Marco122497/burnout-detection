"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BanknoteIcon,
  ClipboardListIcon,
  FileTextIcon,
  HandCoinsIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  Loader2,
  MegaphoneIcon,
  PiggyBankIcon,
  ReceiptIcon,
  TagsIcon,
  UserRoundIcon,
  UsersIcon,
  WalletIcon,
  ChurchIcon,
} from "lucide-react";

import type { Profile, UserRole } from "@/lib/auth/roles";
import { getDashboardPath } from "@/lib/auth/roles";
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

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

function getNavItems(role: UserRole, home: string): NavItem[] {
  const items: NavItem[] = [
    { title: "Dashboard", url: home, icon: LayoutDashboardIcon },
  ];

  if (role === "Administrator") {
    items.push(
      { title: "Users", url: "/administrator/users", icon: UsersIcon },
      {
        title: "Finance",
        url: "/administrator/finance/donations",
        icon: WalletIcon,
      },
      {
        title: "Categories",
        url: "/administrator/categories/donations",
        icon: TagsIcon,
      },
      {
        title: "Announcements",
        url: "/administrator/announcements",
        icon: MegaphoneIcon,
      },
      {
        title: "Audit Trail",
        url: "/administrator/audit",
        icon: ClipboardListIcon,
      },
      { title: "Reports", url: "/administrator/reports", icon: FileTextIcon }
    );
  }

  if (role === "Treasurer") {
    items.push(
      {
        title: "Donations",
        url: "/treasurer/donations",
        icon: HandCoinsIcon,
      },
      {
        title: "Collections",
        url: "/treasurer/collections",
        icon: BanknoteIcon,
      },
      {
        title: "Expenses",
        url: "/treasurer/expenses",
        icon: ReceiptIcon,
      },
      {
        title: "Budgets",
        url: "/treasurer/budgets/allocation",
        icon: PiggyBankIcon,
      },
      { title: "Reports", url: "/treasurer/reports", icon: FileTextIcon }
    );
  }

  if (role === "Parish Officer") {
    items.push(
      {
        title: "Reports",
        url: "/parish-officer/reports/income",
        icon: FileTextIcon,
      },
      {
        title: "Budget Monitoring",
        url: "/parish-officer/budget",
        icon: PiggyBankIcon,
      },
      {
        title: "Announcements",
        url: "/parish-officer/announcements",
        icon: MegaphoneIcon,
      }
    );
  }

  items.push(
    { title: "Profile", url: "/profile", icon: UserRoundIcon },
    { title: "Change password", url: "/change-password", icon: KeyRoundIcon }
  );

  return items;
}

function getPrefetchUrls(role: UserRole, home: string) {
  const urls = [home, "/profile", "/change-password"];
  if (role === "Administrator") {
    urls.push(
      "/administrator/users",
      "/administrator/finance/donations",
      "/administrator/finance/collections",
      "/administrator/finance/expenses",
      "/administrator/finance/budgets",
      "/administrator/categories/donations",
      "/administrator/categories/collections",
      "/administrator/categories/expenses",
      "/administrator/categories/budgets",
      "/administrator/announcements",
      "/administrator/audit",
      "/administrator/reports"
    );
  }
  if (role === "Treasurer") {
    urls.push(
      "/treasurer/donations",
      "/treasurer/collections",
      "/treasurer/expenses",
      "/treasurer/budgets/categories",
      "/treasurer/budgets/allocation",
      "/treasurer/budgets/monitoring",
      "/treasurer/budgets/history",
      "/treasurer/reports"
    );
  }
  if (role === "Parish Officer") {
    urls.push(
      "/parish-officer/reports/income",
      "/parish-officer/reports/expenses",
      "/parish-officer/reports/budget",
      "/parish-officer/reports/collections",
      "/parish-officer/budget",
      "/parish-officer/announcements"
    );
  }
  return urls;
}

function navGroup(pathname: string) {
  if (pathname.startsWith("/administrator/finance")) return "admin-finance";
  if (pathname.startsWith("/administrator/categories")) return "admin-categories";
  if (
    pathname.startsWith("/treasurer/donations") ||
    pathname.startsWith("/treasurer/collections") ||
    pathname.startsWith("/treasurer/expenses")
  ) {
    return "treasurer-transactions";
  }
  if (pathname.startsWith("/treasurer/budgets")) {
    return "treasurer-budgets";
  }
  if (pathname.startsWith("/parish-officer/reports")) {
    return "parish-reports";
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

  if (itemUrl.includes("/finance/")) {
    return pathname.startsWith("/administrator/finance");
  }

  if (itemUrl.startsWith("/administrator/categories")) {
    return pathname.startsWith("/administrator/categories");
  }

  if (itemUrl.startsWith("/parish-officer/reports")) {
    return pathname.startsWith("/parish-officer/reports");
  }

  if (itemUrl.startsWith("/treasurer/budgets")) {
    return pathname.startsWith("/treasurer/budgets");
  }

  if (itemUrl === home) {
    return pathname === home;
  }

  return pathname.startsWith(`${itemUrl}/`) || pathname.startsWith(`${itemUrl}?`);
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

  useEffect(() => {
    for (const url of getPrefetchUrls(profile.role, home)) {
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
