"use client";

import { usePathname } from "next/navigation";

/** Reserves space under the fixed header (promo + primary nav). */
export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const flush = pathname === "/";

  return (
    <main
      className={
        flush
          ? "relative z-10 min-h-[70vh]"
          : "relative z-10 min-h-[70vh] pt-[8.75rem] md:pt-[7.5rem]"
      }
    >
      {children}
    </main>
  );
}
