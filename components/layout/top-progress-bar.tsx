"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export function TopProgressBar({ show }: { show: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!show || !mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5 overflow-hidden bg-primary/10"
      aria-hidden
    >
      <div className="login-top-progress h-full w-1/4 bg-primary" />
    </div>,
    document.body
  );
}
