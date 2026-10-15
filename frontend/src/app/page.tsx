import Link from "next/link";
import { BookCarousel } from "@/components/home/BookCarousel";
import { getHomeSections } from "@/lib/books/supabase-books";
import type { Book } from "@/types";

// ISR: the storefront changes rarely; serve a cached page and refresh
// in the background every 5 minutes instead of querying on every view.
export const revalidate = 300;

export default async function HomePage() {
  let newArrivals: Book[] = [];
  let bestsellers: Book[] = [];
  let onSale: Book[] = [];
  let catalogPreview: Book[] = [];

  try {
    const sections = await getHomeSections();
    newArrivals = sections.newArrivals;
    bestsellers = sections.bestsellers;
    onSale = sections.onSale;
    catalogPreview = sections.catalogPreview;
  } catch (e) {
    console.error("Home catalog load failed", e);
  }

  return (
    <>
      <section
        id="hero"
        className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden pt-[8.75rem] text-white md:pt-[7.5rem]"
        style={{
          background:
            "linear-gradient(150deg, #0F172A 0%, #1E3A8A 45%, #2563EB 100%)",
        }}
      >
        <div className="absolute inset-x-0 bottom-0 z-[1] h-32 bg-gradient-to-t from-white to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-6xl flex-col items-center justify-center px-5 py-24 text-center md:px-8">
          <div className="-translate-y-5">
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-white md:text-7xl lg:text-8xl animate-fade-up">
              Allied Book{" "}
              <span className="italic text-[#93C5FD]">Co.</span>
            </h1>
            <p className="mt-7 font-body text-xl leading-relaxed text-white/85 md:text-2xl animate-fade-up [animation-delay:80ms]">
              The Knowledge Provider
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
      </section>

      <BookCarousel
        id="new-arrivals"
        title="New Arrivals"
        viewAllHref="/shop"
        books={newArrivals}
      />

      <BookCarousel
        id="bestsellers"
        title="In Stock Favorites"
        viewAllHref="/shop"
        books={bestsellers}
        className="border-y border-brass/30 bg-parchment-deep"
      />

      {onSale.length > 0 && (
        <BookCarousel
          id="on-sale"
          title="On Sale"
          viewAllHref="/shop"
          books={onSale}
        />
      )}

      <BookCarousel
        id="catalog"
        title="Book Catalog"
        viewAllHref="/shop"
        books={catalogPreview}
        className="border-t border-brass/30 bg-parchment-deep"
      />

    </>
  );
}
