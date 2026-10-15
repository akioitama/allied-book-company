"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Book } from "@/types";
import { CatalogCard } from "@/components/books/CatalogCard";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  title: string;
  viewAllHref?: string;
  books: Book[];
  /** Auto-advance the carousel (paused on hover / reduced motion). */
  autoPlay?: boolean;
  className?: string;
};

const CARD_STEP = 216; // approximate card width + gap

export function BookCarousel({
  id,
  title,
  viewAllHref = "/shop",
  books,
  autoPlay = true,
  className,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [paused, setPaused] = useState(false);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const visible = Math.max(1, Math.floor(el.clientWidth / CARD_STEP));
    setPageCount(Math.max(1, Math.ceil(books.length / visible)));
  }, [books.length]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const scrollToPage = useCallback((next: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const visible = Math.max(1, Math.floor(el.clientWidth / CARD_STEP));
    const maxPage = Math.max(0, Math.ceil(books.length / visible) - 1);
    const clamped = ((next % (maxPage + 1)) + (maxPage + 1)) % (maxPage + 1);
    setPage(clamped);
    el.scrollTo({
      left: clamped * visible * CARD_STEP,
      behavior: "smooth",
    });
  }, [books.length]);

  useEffect(() => {
    if (!autoPlay || paused || pageCount <= 1) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const id = window.setInterval(() => {
      setPage((p) => {
        const next = (p + 1) % pageCount;
        const el = scrollerRef.current;
        if (el) {
          const visible = Math.max(1, Math.floor(el.clientWidth / CARD_STEP));
          el.scrollTo({
            left: next * visible * CARD_STEP,
            behavior: "smooth",
          });
        }
        return next;
      });
    }, 4200);

    return () => window.clearInterval(id);
  }, [autoPlay, paused, pageCount]);

  if (books.length === 0) return null;

  return (
    <section
      id={id}
      className={cn("bg-white py-14 md:py-16", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl text-ink md:text-4xl">{title}</h2>
          <Link
            href={viewAllHref}
            className="label-caps shrink-0 text-[0.7rem] text-oxblood transition hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Previous books"
            onClick={() => scrollToPage(page - 1)}
            className="absolute -left-2 top-1/3 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center border border-brass/50 bg-white text-ink shadow-ambient transition hover:border-oxblood hover:text-oxblood md:grid lg:-left-4"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next books"
            onClick={() => scrollToPage(page + 1)}
            className="absolute -right-2 top-1/3 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center border border-brass/50 bg-white text-ink shadow-ambient transition hover:border-oxblood hover:text-oxblood md:grid lg:-right-4"
          >
            ›
          </button>

          <div
            ref={scrollerRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {books.map((book) => (
              <CatalogCard key={book.id} book={book} />
            ))}
          </div>
        </div>

        {pageCount > 1 && (
          <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label={`${title} pages`}>
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to page ${i + 1}`}
                aria-current={i === page}
                onClick={() => scrollToPage(i)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition",
                  i === page ? "bg-oxblood" : "bg-brass/50 hover:bg-brass"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
