/** Shared app theme shell. Font comes from root layout (Plus Jakarta Sans). */
export function ChumTheme({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`chum-app student-chum w-full min-w-0 ${className}`}>
      {children}
    </div>
  );
}
