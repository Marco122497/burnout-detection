import { AuthBusyProvider, AuthChrome } from "@/components/auth/auth-busy";
import { AuthSplashGate } from "@/components/auth/splash-screen";
import { ChumTheme } from "@/components/chum-theme";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChumTheme className="min-h-svh">
      <AuthSplashGate>
        <AuthBusyProvider>
          <AuthChrome>{children}</AuthChrome>
        </AuthBusyProvider>
      </AuthSplashGate>
    </ChumTheme>
  );
}
