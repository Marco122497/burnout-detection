"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  scriptProps,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // React 19 / Next 16 warn when a client component renders a <script>.
  // Keep the real blocking script on the server (prevents theme flash),
  // and mark it as JSON on the client so React does not try to execute it.
  const clientScriptProps =
    typeof window === "undefined"
      ? scriptProps
      : { ...scriptProps, type: "application/json" };

  return (
    <NextThemesProvider {...props} scriptProps={clientScriptProps}>
      {children}
    </NextThemesProvider>
  );
}
