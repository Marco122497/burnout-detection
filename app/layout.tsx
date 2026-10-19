import type { Metadata } from "next";
import { Outfit } from "next/font/google";

import { AiWakeOnLoad } from "@/components/ai-wake-on-load";
import { SafePointerCapturePatch } from "@/components/safe-pointer-capture-patch";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AI_WAKE_SCRIPT } from "@/lib/student/wake-ai-browser";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "Burnout",
    template: "Burnout | %s",
  },
  description:
    "Student burnout monitoring, early warning, and guidance intervention",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <script dangerouslySetInnerHTML={{ __html: AI_WAKE_SCRIPT }} />
        <AiWakeOnLoad />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {process.env.NODE_ENV === "development" ? (
            <SafePointerCapturePatch />
          ) : null}
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
