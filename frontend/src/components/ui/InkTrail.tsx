"use client";

import { useEffect, useRef, useState } from "react";

type Blot = { id: number; x: number; y: number };

/** Soft blue ink blooms that trail the cursor. */
export function InkTrail() {
  const [blots, setBlots] = useState<Blot[]>([]);
  const idRef = useRef(0);
  const lastRef = useRef(0);
  const reducedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = mq.matches;
    const onChange = () => {
      reducedRef.current = mq.matches;
    };
    mq.addEventListener("change", onChange);

    const onMove = (e: PointerEvent) => {
      if (reducedRef.current) return;
      const now = Date.now();
      if (now - lastRef.current < 90) return;
      lastRef.current = now;
      const id = ++idRef.current;
      setBlots((prev) => [...prev.slice(-10), { id, x: e.clientX, y: e.clientY }]);
      window.setTimeout(() => {
        setBlots((prev) => prev.filter((b) => b.id !== id));
      }, 900);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" aria-hidden>
      {blots.map((b) => (
        <span
          key={b.id}
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-oxblood/30 animate-ink-bloom"
          style={{ left: b.x, top: b.y }}
        />
      ))}
    </div>
  );
}
