"use client";

import Link from "next/link";
import type { Book } from "@/types";
import { formatPrice } from "@/lib/utils";
import { resolveOurPrice } from "@/lib/books/pricing";
import { AddToCartButton } from "@/components/books/AddToCartButton";
import { BookCover } from "@/components/books/BookCover";
import { coverSourcesForBook } from "@/lib/books/covers";
import { cn } from "@/lib/utils";

type Props = {
  book: Book;
  className?: string;
};

export function CatalogCard({ book, className }: Props) {
  const { cents: salePrice, discountPercent: discount } = resolveOurPrice(
    book.price_cents,
    book.discount_percent
  );
  const [primary, ...fallbacks] = coverSourcesForBook({
    cover_image_url: book.cover_image_url,
    isbn: book.isbn,
  });

  return (
    <article className={cn("flex w-[180px] shrink-0 flex-col sm:w-[200px]", className)}>
      <Link
        href={`/shop/${book.slug}`}
        className="relative block aspect-[2/3] overflow-hidden border border-brass/50 bg-parchment-deep"
      >
        <BookCover
          src={primary}
          fallbackSrcs={fallbacks}
          alt={`Cover of ${book.title}`}
          title={book.title}
          sizes="200px"
          imageClassName="transition duration-500 hover:scale-[1.03]"
        />
        {discount > 0 && (
          <span className="absolute left-0 top-0 z-10 bg-oxblood px-2 py-1 font-label text-[0.58rem] uppercase tracking-[0.12em] text-white">
            −{discount}%
          </span>
        )}
        {book.is_new && discount === 0 && (
          <span className="absolute left-0 top-0 z-10 bg-forest px-2 py-1 font-label text-[0.58rem] uppercase tracking-[0.12em] text-white">
            New
          </span>
        )}
      </Link>

      <h3 className="mt-3 line-clamp-2 min-h-[2.6em] font-display text-base leading-snug text-ink">
        <Link href={`/shop/${book.slug}`} className="hover:text-oxblood">
          {book.title}
        </Link>
      </h3>
      <p className="mt-1 font-body text-sm text-ink-soft">
        By: <span className="text-oxblood">{book.author}</span>
      </p>

      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        {discount > 0 && (
          <span className="font-body text-sm text-oxblood line-through">
            {formatPrice(book.price_cents)}
          </span>
        )}
        <span className="font-display text-lg text-ink">{formatPrice(salePrice)}</span>
      </div>

      <div className="mt-3">
        <AddToCartButton book={book} compact className="w-full" />
      </div>
    </article>
  );
}
