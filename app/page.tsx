import { ChumTheme } from "@/components/chum-theme";
import { LandingPage } from "@/components/landing/landing-page";
import { APP_DEVELOPER } from "@/lib/app-meta";
import { getDeveloperProfile } from "@/lib/developer-profile";
import { activateBurnoutAi } from "@/lib/student/activate-ai";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Burnout Detection System",
  description:
    "A weekly academic burnout check for college students. It scores risk, warns about next week and week 2, and supports follow-up by instructors and the Guidance Office.",
};

export default async function HomePage() {
  activateBurnoutAi();
  let developerName = APP_DEVELOPER;
  try {
    developerName = (await getDeveloperProfile(createAdminClient())).name;
  } catch {
    developerName = APP_DEVELOPER;
  }

  return (
    <ChumTheme className="min-h-svh">
      <LandingPage developerName={developerName} />
    </ChumTheme>
  );
}
