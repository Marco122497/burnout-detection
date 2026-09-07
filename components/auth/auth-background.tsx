/** Minimal slanted-square vector backdrop for auth pages. */
export function AuthBackground() {
  const cols = 18;
  const rows = 22;
  const size = 5.2;
  const gap = 1.1;
  const step = size + gap;
  const originX = -6;
  const originY = -8;

  const squares = Array.from({ length: rows * cols }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      key: `sq-${i}`,
      x: originX + col * step,
      y: originY + row * step,
      size,
    };
  });

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_-10%,_rgb(45_190_120_/_0.14),_transparent_55%),radial-gradient(90%_70%_at_100%_100%,_rgb(45_190_120_/_0.1),_transparent_50%)] dark:bg-[radial-gradient(120%_80%_at_10%_-10%,_rgb(45_190_120_/_0.12),_transparent_55%),radial-gradient(90%_70%_at_100%_100%,_rgb(31_154_92_/_0.12),_transparent_50%)]" />

      <svg
        className="absolute -inset-[24%] size-[148%] text-[color:var(--chum-green,#2dbe78)]/[0.12] dark:text-[color:var(--chum-green,#2dbe78)]/[0.16]"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <g transform="rotate(-22 50 50)">
          {squares.map((square) => (
            <rect
              key={square.key}
              x={square.x}
              y={square.y}
              width={square.size}
              height={square.size}
              stroke="currentColor"
              strokeWidth="0.12"
            />
          ))}
        </g>
      </svg>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_22%,_var(--background)_95%)]" />
    </div>
  );
}
