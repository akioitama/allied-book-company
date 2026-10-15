import Link from "next/link";
import type { Book } from "@/types";
import { cn, formatPrice } from "@/lib/utils";
import { resolveOurPrice } from "@/lib/books/pricing";
import { AddToCartButton } from "@/components/books/AddToCartButton";
import { BookCover } from "@/components/books/BookCover";
import { coverSourcesForBook } from "@/lib/books/covers";

type Props = {
  book: Book;
  className?: string;
  showAdd?: boolean;
};

export function BookCard({ book, className, showAdd = true }: Props) {
  const categoryName = book.category_name ?? null;
  const { cents: salePrice, discountPercent: discount } = resolveOurPrice(
    book.price_cents,
    book.discount_percent
  );
  const [primary, ...fallbacks] = coverSourcesForBook({
    cover_image_url: book.cover_image_url,
    isbn: book.isbn,
  });

  return (
    <article
      className={cn(
        "group map-panel flex flex-col overflow-hidden transition duration-500",
        "hover:-translate-y-2 hover:border-oxblood/50 hover:shadow-lift",
        "motion-reduce:transform-none motion-reduce:transition-none",
        className
      )}
    >
      <Link
        href={`/shop/${book.slug}`}
        className="relative block aspect-[3/4] overflow-hidden"
      >
        <BookCover
          src={primary}
          fallbackSrcs={fallbacks}
          alt={`Cover of ${book.title}`}
          title={book.title}
          imageClassName="transition duration-700 group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <span className="absolute left-3 top-3 z-10 border border-[#93C5FD] bg-white px-2 py-1 font-label text-[0.58rem] uppercase tracking-[0.16em] text-[#1E3A8A] shadow-ambient">
          {categoryName ?? "Catalog"}
        </span>
        {discount > 0 && (
          <span className="absolute right-3 top-3 z-10 bg-oxblood px-2 py-1 font-label text-[0.58rem] uppercase tracking-[0.12em] text-white">
            −{discount}%
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 z-10 h-1/3 bg-gradient-to-t from-ink/25 to-transparent opacity-0 transition group-hover:opacity-100" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="eyebrow">{categoryName}</p>
        <h3 className="font-display text-xl leading-snug text-ink">
          <Link href={`/shop/${book.slug}`} className="hover:text-oxblood">
            {book.title}
          </Link>
        </h3>
        <p className="font-body text-ink-soft">{book.author}</p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-brass/30 pt-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-display text-lg text-ink">{formatPrice(salePrice)}</p>
            {discount > 0 && (
              <p className="font-body text-sm text-ink-soft line-through">
                {formatPrice(book.price_cents)}
              </p>
            )}
          </div>
          {showAdd && <AddToCartButton book={book} compact />}
        </div>
      </div>
    </article>
  );
}
