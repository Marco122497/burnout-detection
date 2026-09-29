"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { getDashboardPath, type Profile } from "@/lib/auth/roles";
import { getNavItems, type NavItem } from "@/lib/auth/navigation";
import { useNavigationPending } from "@/components/layout/navigation-pending";
import { cn } from "@/lib/utils";

function isItemActive(pathname: string, itemUrl: string, home: string) {
  if (pathname === itemUrl) return true;
  if (itemUrl === home) return pathname === home;
  return pathname.startsWith(`${itemUrl}/`);
}

const SHORT_LABELS: Record<string, string> = {
  Dashboard: "Home",
  "Weekly Monitoring": "Monitor",
  "Assessment History": "History",
  Notifications: "Alerts",
  Recommendations: "Tips",
};

function withMonitoringCentered(items: NavItem[]) {
  const centerIndex = items.findIndex((item) =>
    item.url.endsWith("/monitoring")
  );
  if (centerIndex < 0 || items.length < 3) return items;

  const center = items[centerIndex];
  const rest = items.filter((_, index) => index !== centerIndex);
  const leftCount = Math.floor(rest.length / 2);
  return [...rest.slice(0, leftCount), center, ...rest.slice(leftCount)];
}

const ICON_COLOR: Record<string, { icon: string; wash: string }> = {
  Dashboard: {
    icon: "text-[color:var(--chum-green)]",
    wash: "bg-[color:var(--chum-green-soft)]",
  },
  "Weekly Monitoring": {
    icon: "text-rose-500 dark:text-rose-400",
    wash: "bg-rose-500/15",
  },
  "Assessment History": {
    icon: "text-amber-500 dark:text-amber-400",
    wash: "bg-amber-500/15",
  },
  Notifications: {
    icon: "text-sky-500 dark:text-sky-400",
    wash: "bg-sky-500/15",
  },
  Recommendations: {
    icon: "text-yellow-500 dark:text-yellow-400",
    wash: "bg-yellow-500/15",
  },
};

export function StudentBottomNav({
  profile,
  monitoringDue = false,
}: {
  profile: Profile;
  monitoringDue?: boolean;
}) {
  const pathname = usePathname();
  const { isPending, isBusy, pendingHref, navigate } = useNavigationPending();
  const home = getDashboardPath(profile.role);
  const items = monitoringDue
    ? withMonitoringCentered(getNavItems(profile.role, home))
    : getNavItems(profile.role, home);
  const activePath = pendingHref ?? pathname;

  return (
    <nav
      aria-label="Student menu"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 md:hidden"
    >
      <div className="pointer-events-auto border-t border-border/80 bg-background/95 px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(16_40_28/10%)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5">
          {items.map((item) => {
            const isActive = isItemActive(activePath, item.url, home);
            const isLoading =
              isPending &&
              pendingHref !== null &&
              isItemActive(pendingHref, item.url, home);
            const Icon = item.icon;
            const tone = ICON_COLOR[item.title];
            const isMonitoring = item.url.endsWith("/monitoring");
            const needsTap = monitoringDue && isMonitoring && !isActive;

            return (
              <button
                key={item.url}
                type="button"
                disabled={isBusy}
                aria-label={
                  needsTap ? "Weekly monitoring is open. Tap to answer." : undefined
                }
                onClick={() => {
                  if (isBusy) return;
                  if (
                    isItemActive(pathname, item.url, home) &&
                    pathname === item.url
                  ) {
                    return;
                  }
                  navigate(item.url);
                }}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold tracking-tight transition-colors",
                  needsTap && "-mt-3",
                  isActive || needsTap
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "relative flex items-center justify-center rounded-full transition-colors",
                    needsTap ? "size-12" : "size-8",
                    needsTap
                      ? "bg-rose-500 text-white shadow-md [animation:monitor-tap_1.4s_ease-in-out_infinite]"
                      : isActive
                        ? tone?.wash
                        : "bg-transparent"
                  )}
                >
                  {needsTap ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 animate-ping rounded-full bg-rose-400/80"
                    />
                  ) : null}
                  {isLoading ? (
                    <Loader2
                      className={cn(
                        "relative size-5 animate-spin",
                        needsTap ? "text-white" : tone?.icon
                      )}
                    />
                  ) : (
                    <Icon
                      className={cn(
                        "relative size-5",
                        needsTap ? "text-white" : tone?.icon,
                        !needsTap && (isActive ? "opacity-100" : "opacity-70")
                      )}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "w-full truncate text-center",
                    needsTap && "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {SHORT_LABELS[item.title] ?? item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
