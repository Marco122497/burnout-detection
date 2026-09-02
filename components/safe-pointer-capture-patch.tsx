"use client";

import { useEffect } from "react";

/**
 * Next.js devtools Draggable can throw NotFoundError when releasing pointer
 * capture after the browser already released the pointer (e.g. on modal open).
 */
export function SafePointerCapturePatch() {
  useEffect(() => {
    const proto = Element.prototype;
    const original = proto.releasePointerCapture;
    const patched = original as typeof original & { __safePatched?: boolean };

    if (patched.__safePatched) {
      return;
    }

    proto.releasePointerCapture = function releasePointerCaptureSafe(
      pointerId: number
    ) {
      try {
        original.call(this, pointerId);
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotFoundError") {
          return;
        }
        throw error;
      }
    };
    patched.__safePatched = true;

    return () => {
      proto.releasePointerCapture = original;
      patched.__safePatched = false;
    };
  }, []);

  return null;
}
