import { ChumTheme } from "@/components/chum-theme";
import { LandingGate } from "@/components/landing/landing-gate";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata = {
  title: "Burnout Detection System",
  description:
    "A weekly academic burnout check for college students, with early warning for instructors and the Guidance Office.",
};

export default function HomePage() {
  return (
    <ChumTheme className="min-h-svh">
      <LandingGate>
        <LandingPage />
      </LandingGate>
    </ChumTheme>
  );
}
