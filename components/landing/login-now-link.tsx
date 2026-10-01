"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LEAVE_MS = 460;

const LeaveToLoginContext = createContext<(() => void) | null>(null);

export function LandingForeground({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  function leave() {
    if (leaving) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      router.push("/login");
      return;
    }
    setLeaving(true);
    window.setTimeout(() => router.push("/login"), LEAVE_MS);
  }

  return (
    <LeaveToLoginContext.Provider value={leave}>
      <div
        className={cn(
          "relative z-10 flex min-h-svh w-full flex-col px-5 py-3 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-8 lg:h-full xl:px-14 motion-reduce:transition-none",
          leaving && "pointer-events-none translate-y-3 scale-[0.985] opacity-0"
        )}
      >
        {children}
      </div>
    </LeaveToLoginContext.Provider>
  );
}

export function LoginNowLink() {
  const leave = useContext(LeaveToLoginContext);
  const router = useRouter();

  return (
    <Link
      href="/login"
      className={cn(
        buttonVariants({ size: "lg" }),
        "h-14 rounded-full px-12 text-lg font-bold shadow-[0_12px_28px_rgb(45_190_120_/_0.4)]"
      )}
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        if (leave) {
          leave();
          return;
        }
        router.push("/login");
      }}
    >
      Login Now
    </Link>
  );
}
