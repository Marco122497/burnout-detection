import { ChumTheme } from "@/components/chum-theme";
import { LandingPage } from "@/components/landing/landing-page";
import { activateBurnoutAi } from "@/lib/student/activate-ai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Burnout Detection System",
  description:
    "A weekly academic burnout check for college students. It scores risk, warns about next week and week 2, and supports follow-up by instructors and the Guidance Office.",
};

export default function HomePage() {
  activateBurnoutAi();

  return (
    <ChumTheme className="min-h-svh">
      <LandingPage />
    </ChumTheme>
  );
}
