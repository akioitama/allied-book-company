"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SUBJECT_GROUPS,
  subjectHref,
  subSubjectHref,
  type SubjectGroup,
} from "@/lib/data/subjects";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Light text for blue/scrolled header */
  inverted?: boolean;
};

export function SubjectsMenu({ className, inverted }: Props) {
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState(SUBJECT_GROUPS[0]?.slug ?? "");
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const activeGroup: SubjectGroup | undefined =
    SUBJECT_GROUPS.find((g) => g.slug === activeSlug) ?? SUBJECT_GROUPS[0];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || buttonRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="subjects-panel"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "label-caps inline-flex h-5 items-center gap-1 p-0 text-[0.7rem] leading-none transition",
          inverted
            ? open
              ? "text-white"
              : "text-white/80 hover:text-white"
            : open
              ? "text-oxblood"
              : "text-ink-soft hover:text-oxblood"
        )}
      >
        Subjects
        <svg
          viewBox="0 0 24 24"
          className={cn("h-3 w-3 shrink-0 transition", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && activeGroup && (
        <div
          id="subjects-panel"
          ref={panelRef}
          className="absolute left-1/2 top-[calc(100%+0.85rem)] z-50 w-[min(94vw,52rem)] -translate-x-1/2 border border-brass/40 bg-white text-ink shadow-lift md:left-0 md:translate-x-0"
          role="dialog"
          aria-label="Browse by subject"
        >
          <div className="flex items-center justify-between border-b border-brass/25 px-5 py-3 md:px-6">
            <div>
              <p className="eyebrow">Browse</p>
              <h2 className="mt-0.5 font-display text-xl text-ink">Subjects</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="label-caps text-[0.62rem] text-oxblood hover:underline"
            >
              Close
            </button>
          </div>

          <div className="grid max-h-[min(70vh,560px)] md:grid-cols-[13.5rem_1fr]">
            {/* Parent subjects */}
            <nav
              className="border-b border-brass/25 md:border-b-0 md:border-r md:border-brass/25"
              aria-label="Subjects"
            >
              <ul className="flex gap-1 overflow-x-auto px-3 py-3 md:block md:max-h-[min(70vh,560px)] md:overflow-y-auto md:px-0 md:py-2">
                {SUBJECT_GROUPS.map((group) => {
                  const selected = group.slug === activeGroup.slug;
                  return (
                    <li key={group.slug} className="shrink-0 md:shrink">
                      <button
                        type="button"
                        onClick={() => setActiveSlug(group.slug)}
                        onMouseEnter={() => setActiveSlug(group.slug)}
                        className={cn(
                          "w-full whitespace-nowrap px-3 py-2.5 text-left font-body text-sm transition md:whitespace-normal",
                          selected
                            ? "bg-[#EFF6FF] font-medium text-[#1E3A8A] md:border-r-2 md:border-[#2563EB]"
                            : "text-ink-soft hover:bg-parchment-deep hover:text-ink"
                        )}
                      >
                        {group.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Sub-subjects */}
            <div className="flex min-h-0 flex-col overflow-hidden px-5 py-4 md:px-6">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-lg text-ink">
                  {activeGroup.name}
                </h3>
                <Link
                  href={subjectHref(activeGroup)}
                  onClick={() => setOpen(false)}
                  className="label-caps text-[0.6rem] text-oxblood hover:underline"
                >
                  View all
                </Link>
              </div>

              {activeGroup.children.length === 0 ? (
                <p className="font-body text-sm text-ink-soft">
                  Browse the full{" "}
                  <Link
                    href={subjectHref(activeGroup)}
                    onClick={() => setOpen(false)}
                    className="text-oxblood hover:underline"
                  >
                    {activeGroup.name}
                  </Link>{" "}
                  shelf.
                </p>
              ) : (
                <ul className="max-h-[min(52vh,420px)] columns-1 gap-x-6 overflow-y-auto sm:columns-2 lg:columns-3">
                  {activeGroup.children.map((child) => (
                    <li
                      key={`${activeGroup.slug}-${child.slug}`}
                      className="break-inside-avoid"
                    >
                      <Link
                        href={subSubjectHref(activeGroup, child)}
                        onClick={() => setOpen(false)}
                        className="block border-b border-transparent py-1.5 font-body text-sm text-ink-soft transition hover:border-brass/40 hover:text-oxblood"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
