import { AuthBusyProvider, AuthChrome } from "@/components/auth/auth-busy";
import { SignedInAuthRedirect } from "@/components/auth/signed-in-auth-redirect";
import { ChumTheme } from "@/components/chum-theme";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChumTheme className="min-h-svh">
      <AuthBusyProvider>
        <SignedInAuthRedirect />
        <AuthChrome>{children}</AuthChrome>
      </AuthBusyProvider>
    </ChumTheme>
  );
}
