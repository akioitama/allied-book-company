"use client";

import { usePathname } from "next/navigation";

/** Reserves space under the fixed header (promo + primary nav). */
export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Full-bleed heroes clear the fixed header themselves (same as home).
  const flush =
    pathname === "/" || pathname === "/about" || pathname === "/contact";

  return (
    <main
      className={
        flush
          ? "relative z-10 min-h-[70vh]"
          : "relative z-10 min-h-[70vh] pt-[10.75rem] md:pt-[9.5rem]"
      }
    >
      {children}
    </main>
  );
}
