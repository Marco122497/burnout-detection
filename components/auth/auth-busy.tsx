"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { AuthBackground } from "@/components/auth/auth-background";
import { AppMetaFooter } from "@/components/layout/sidebar-app-footer";
import { ModeToggle } from "@/components/mode-toggle";

type AuthBusyContextValue = {
  busy: boolean;
  setBusy: (busy: boolean) => void;
};

const AuthBusyContext = createContext<AuthBusyContextValue | null>(null);

export function AuthBusyProvider({ children }: { children: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  const value = useMemo(() => ({ busy, setBusy }), [busy]);
  return (
    <AuthBusyContext.Provider value={value}>{children}</AuthBusyContext.Provider>
  );
}

export function useAuthBusy() {
  return useContext(AuthBusyContext);
}

export function AuthChrome({ children }: { children: React.ReactNode }) {
  const authBusy = useAuthBusy();

  return (
    <div className="relative flex min-h-svh flex-1 flex-col">
      <div className="absolute top-4 right-4 z-20">
        <ModeToggle disabled={Boolean(authBusy?.busy)} />
      </div>
      <AuthBackground />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="Burnout Monitor"
            width={128}
            height={128}
            className="mb-4 size-28 object-contain sm:size-32"
          />
          <p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            <span className="student-chum-marker">BURNOUT SYSTEM</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Student wellness & early intervention
          </p>
        </div>
        {children}
      </div>
      <div className="relative z-10 px-4 pb-6 text-center">
        <AppMetaFooter className="text-xs text-muted-foreground/70 sm:text-sm" />
      </div>
    </div>
  );
}
