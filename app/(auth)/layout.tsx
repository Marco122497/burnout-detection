import { AuthBusyProvider, AuthChrome } from "@/components/auth/auth-busy";
import { SignedInAuthRedirect } from "@/components/auth/signed-in-auth-redirect";
import { ChumTheme } from "@/components/chum-theme";
import { APP_DEVELOPER } from "@/lib/app-meta";
import { getDeveloperProfile } from "@/lib/developer-profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let developerName = APP_DEVELOPER;
  try {
    developerName = (await getDeveloperProfile(createAdminClient())).name;
  } catch {
    developerName = APP_DEVELOPER;
  }

  return (
    <ChumTheme className="min-h-svh">
      <AuthBusyProvider>
        <SignedInAuthRedirect />
        <AuthChrome developerName={developerName}>{children}</AuthChrome>
      </AuthBusyProvider>
    </ChumTheme>
  );
}
