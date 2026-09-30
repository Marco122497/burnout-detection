import { AuthBusyProvider, AuthChrome } from "@/components/auth/auth-busy";
import { ChumTheme } from "@/components/chum-theme";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChumTheme className="min-h-svh">
      <AuthBusyProvider>
        <AuthChrome>{children}</AuthChrome>
      </AuthBusyProvider>
    </ChumTheme>
  );
}
