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
  isBusy: boolean;
  pendingHref: string | null;
  navigate: (url: string) => void;
  setLockChrome: (locked: boolean) => void;
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
  const [lockChrome, setLockChrome] = useState(false);
  /** Stays true until the destination route has committed and painted. */
  const [loadingVisible, setLoadingVisible] = useState(false);

  const clearLoading = useCallback(() => {
    setPendingHref(null);
    setLoadingVisible(false);
  }, []);

  const navigate = useCallback(
    (url: string) => {
      if (url === currentUrl(pathname)) return;
      if (pathsMatch(pathname, url) && !url.includes("?")) return;

      setPendingHref(url);
      setLoadingVisible(true);
      startTransition(() => {
        router.push(url);
      });
    },
    [pathname, router]
  );

  // Keep loading until URL matches + React transition finishes + page can paint.
  useEffect(() => {
    if (!loadingVisible || !pendingHref) return;
    if (!pathsMatch(pathname, pendingHref)) return;
    if (isPending) return;

    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    let timeoutId = 0;

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        // Extra beat so streamed page content can appear before we hide loading.
        timeoutId = window.setTimeout(() => {
          if (!cancelled) clearLoading();
        }, 200);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(timeoutId);
    };
  }, [pathname, pendingHref, isPending, loadingVisible, clearLoading]);

  // Safety net if a navigation stalls.
  useEffect(() => {
    if (!loadingVisible) return;
    const timeout = window.setTimeout(() => {
      clearLoading();
    }, 20_000);
    return () => window.clearTimeout(timeout);
  }, [loadingVisible, pendingHref, clearLoading]);

  const navigating = loadingVisible || isPending || pendingHref !== null;
  const value = useMemo(
    () => ({
      isPending: navigating,
      isBusy: navigating || lockChrome,
      pendingHref,
      navigate,
      setLockChrome,
    }),
    [navigating, lockChrome, pendingHref, navigate]
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
  const setLockChrome = useCallback((_locked: boolean) => {}, []);

  return useMemo(
    () =>
      context ?? {
        isPending: false,
        isBusy: false,
        pendingHref: null,
        navigate,
        setLockChrome,
      },
    [context, navigate, setLockChrome]
  );
}
