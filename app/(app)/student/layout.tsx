import { requireRole } from "@/lib/auth/session";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["Student"]);
  return (
    <div className="relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-[radial-gradient(ellipse_at_top,_oklch(0.94_0.03_195/_0.7),_transparent_70%)]"
      />
      {children}
    </div>
  );
}
