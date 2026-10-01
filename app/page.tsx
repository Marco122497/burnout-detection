import { ChumTheme } from "@/components/chum-theme";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata = {
  title: "Burnout Detection System",
  description:
    "A weekly academic burnout check for college students. It scores risk, warns about next week and week 2, and supports follow-up by instructors and the Guidance Office.",
};

export default function HomePage() {
  return (
    <ChumTheme className="min-h-svh">
      <LandingPage />
    </ChumTheme>
  );
}
