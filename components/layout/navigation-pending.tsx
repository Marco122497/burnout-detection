"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type NavigationPendingContextValue = {
  isPending: boolean;
  pendingHref: string | null;
  navigate: (url: string) => void;
};

const NavigationPendingContext =
  createContext<NavigationPendingContextValue | null>(null);

function normalizePath(href: string) {
  const path = href.split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path || "/";
}

function currentUrl(pathname: string) {
  if (typeof window === "undefined") return pathname;
  return `${pathname}${window.location.search}`;
}

function pathsMatch(pathname: string, pendingHref: string) {
  const current = normalizePath(pathname);
  const pending = normalizePath(pendingHref);
  return current === pending;
}

export function NavigationPendingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingHref) return;
    if (pathsMatch(pathname, pendingHref)) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  const navigate = useCallback(
    (url: string) => {
      if (url === currentUrl(pathname)) return;
      if (pathsMatch(pathname, url) && !url.includes("?")) return;

      setPendingHref(url);
      startTransition(() => {
        router.push(url);
      });
    },
    [pathname, router]
  );

  const value = useMemo(
    () => ({
      isPending: isPending || pendingHref !== null,
      pendingHref,
      navigate,
    }),
    [isPending, pendingHref, navigate]
  );

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
    </NavigationPendingContext.Provider>
  );
}

export function useNavigationPending() {
  const context = useContext(NavigationPendingContext);
  const router = useRouter();

  const navigate = useCallback(
    (url: string) => {
      router.push(url);
    },
    [router]
  );

  return useMemo(
    () =>
      context ?? {
        isPending: false,
        pendingHref: null,
        navigate,
      },
    [context, navigate]
  );
}
