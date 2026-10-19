"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ConstructionIcon } from "lucide-react";
import { toast } from "sonner";

export function MaintenanceNotice() {
  useEffect(() => {
    toast.error("The system is under maintenance.");
  }, []);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100">
      <ConstructionIcon className="size-14 text-amber-400" aria-hidden />
      <p className="mt-6 text-xs font-semibold tracking-[0.28em] text-amber-400/90 uppercase">
        503
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Under maintenance
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
        This site is temporarily unavailable while maintenance is in progress.
        Please check back later.
      </p>
      <p className="mt-10 text-xs text-zinc-500">We’ll be back soon.</p>
      <Link
        href="/login"
        className="mt-8 text-xs text-zinc-600 underline-offset-4 hover:text-zinc-400 hover:underline"
      >
        Go back to login
      </Link>
    </main>
  );
}
