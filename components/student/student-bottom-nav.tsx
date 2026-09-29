"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { getDashboardPath, type Profile } from "@/lib/auth/roles";
import { getNavItems } from "@/lib/auth/navigation";
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

export function StudentBottomNav({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const { isPending, isBusy, pendingHref, navigate } = useNavigationPending();
  const home = getDashboardPath(profile.role);
  const items = getNavItems(profile.role, home);
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

            return (
              <button
                key={item.url}
                type="button"
                disabled={isBusy}
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
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-colors",
                    isActive ? tone?.wash : "bg-transparent"
                  )}
                >
                  {isLoading ? (
                    <Loader2
                      className={cn("size-5 animate-spin", tone?.icon)}
                    />
                  ) : (
                    <Icon
                      className={cn(
                        "size-5",
                        tone?.icon,
                        isActive ? "opacity-100" : "opacity-70"
                      )}
                    />
                  )}
                </span>
                <span className="w-full truncate text-center">
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
