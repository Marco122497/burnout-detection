export function TopProgressBar({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/10"
      aria-hidden
    >
      <div className="login-top-progress h-full w-1/4 bg-primary" />
    </div>
  );
}
