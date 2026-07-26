"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

function currentUrl(pathname: string) {
  if (typeof window === "undefined") return pathname;
  return `${pathname}${window.location.search}`;
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
  const wasPending = useRef(false);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      setPendingHref(null);
    }
    wasPending.current = isPending;
  }, [isPending]);

  const navigate = useCallback(
    (url: string) => {
      if (url === currentUrl(pathname)) return;

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
  if (!context) {
    throw new Error(
      "useNavigationPending must be used within NavigationPendingProvider"
    );
  }
  return context;
}
