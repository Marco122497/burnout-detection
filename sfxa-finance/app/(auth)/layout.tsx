export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.94_0.02_250),_transparent_55%),linear-gradient(to_bottom,_oklch(0.985_0.01_90),_oklch(0.96_0.015_240))]"
      />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            SFXA Finance
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Parish financial management
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
