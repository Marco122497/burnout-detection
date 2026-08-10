import { AuthSplashGate } from "@/components/auth/splash-screen";
import { ModeToggle } from "@/components/mode-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSplashGate>
      <div className="relative flex min-h-full flex-1 flex-col">
        <div className="absolute top-4 right-4 z-20">
          <ModeToggle />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.93_0.03_195),_transparent_55%),linear-gradient(to_bottom,_oklch(0.985_0.01_200),_oklch(0.95_0.02_220))] dark:bg-[radial-gradient(ellipse_at_top,_oklch(0.35_0.03_210),_transparent_55%),linear-gradient(to_bottom,_oklch(0.22_0.01_230),_oklch(0.18_0.015_230))]"
        />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src="/logo.png"
              alt="Burnout Monitor"
              width={128}
              height={128}
              className="mb-4 size-28 object-contain sm:size-32"
            />
            <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Burnout Monitor
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Student wellness & early intervention
            </p>
          </div>
          {children}
        </div>
      </div>
    </AuthSplashGate>
  );
}
