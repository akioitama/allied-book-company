import Image from "next/image";
import Link from "next/link";
import { BookCarousel } from "@/components/home/BookCarousel";
import { getHomeSections } from "@/lib/books/supabase-books";
import type { Book } from "@/types";

// ISR: the storefront changes rarely; serve a cached page and refresh
// in the background every 5 minutes instead of querying on every view.
export const revalidate = 300;

export default async function HomePage() {
  let newArrivals: Book[] = [];

  try {
    const sections = await getHomeSections();
    newArrivals = sections.newArrivals;
  } catch (e) {
    console.error("Home catalog load failed", e);
  }

  return (
    <>
      <section
        id="hero"
        className="relative flex min-h-[92vh] flex-col overflow-hidden pt-[10.75rem] text-white md:pt-[9.5rem]"
        style={{
          background:
            "linear-gradient(150deg, #0F172A 0%, #1E3A8A 45%, #2563EB 100%)",
        }}
      >
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-5 py-16 text-center md:px-8 md:py-20">
          <div className="-translate-y-[calc(3.5rem-64px)] md:-translate-y-[calc(5rem-64px)]">
            <div className="mx-auto mb-8 inline-flex rounded-full bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm animate-fade-up">
              <Image
                src="/logo.png"
                alt="Allied Book Co."
                width={96}
                height={88}
                className="h-16 w-auto md:h-20"
                priority
              />
            </div>
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-white md:text-7xl lg:text-8xl animate-fade-up [animation-delay:40ms]">
              Allied Book{" "}
              <span className="italic text-[#93C5FD]">Co.</span>
            </h1>
            <p className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-label text-[calc(0.72rem+2px)] uppercase tracking-[0.28em] text-[#BFDBFE] animate-fade-up [animation-delay:80ms] md:gap-x-5 md:text-[calc(0.8rem+2px)] md:tracking-[0.32em]">
              <span>Books</span>
              <span
                className="h-3 w-px bg-gradient-to-b from-transparent via-[#93C5FD] to-transparent md:h-3.5"
                aria-hidden
              />
              <span>Journals</span>
              <span
                className="h-3 w-px bg-gradient-to-b from-transparent via-[#93C5FD] to-transparent md:h-3.5"
                aria-hidden
              />
              <span>E-Products</span>
            </p>
            <div className="mt-11 flex flex-wrap items-center justify-center gap-4 animate-fade-up [animation-delay:160ms]">
              <Link
                href="/shop"
                className="label-caps border border-white bg-white px-7 py-3.5 text-[0.72rem] text-[#0F172A] transition hover:bg-[#BFDBFE]"
              >
                Enter the Shop
              </Link>
              <Link
                href="/about"
                className="label-caps border border-white/50 px-7 py-3.5 text-[0.72rem] text-white transition hover:bg-white/10"
              >
                Our Story
              </Link>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full bg-[#FBBF24] py-3.5 text-center shadow-[0_-8px_30px_rgba(0,0,0,0.18)] md:py-4">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 font-label uppercase tracking-[0.18em] text-[#0F172A] md:gap-x-4 md:tracking-[0.22em]">
            <span className="text-base font-bold md:text-lg">15% flat</span>
            <span className="hidden h-4 w-px bg-[#0F172A]/35 sm:block" aria-hidden />
            <span className="text-sm font-semibold md:text-base">
              discount on all products
            </span>
          </p>
        </div>
      </section>

      <BookCarousel
        id="new-arrivals"
        title="New Arrivals"
        viewAllHref="/shop"
        books={newArrivals}
      />
    </>
  );
}
