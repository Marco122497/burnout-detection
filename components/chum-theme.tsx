import { Nunito, Quicksand } from "next/font/google";

const chumSans = Nunito({
  subsets: ["latin"],
  variable: "--font-chum-sans",
  display: "swap",
});

const chumDisplay = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chum-display",
  display: "swap",
});

/** Shared GradeChum-inspired theme for app shell, auth, and student surfaces. */
export function ChumTheme({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${chumSans.variable} ${chumDisplay.variable} chum-app student-chum w-full min-w-0 ${className}`}
    >
      {children}
    </div>
  );
}
