import Link from "next/link";
import type { Book } from "@/types";
import { formatPrice } from "@/lib/utils";
import { resolveOurPrice } from "@/lib/books/pricing";
import { BookCover } from "@/components/books/BookCover";
import { coverSourcesForBook } from "@/lib/books/covers";
import { cn } from "@/lib/utils";

type Props = {
  book: Book;
  className?: string;
};

function formatPublishYear(
  year: number | null | undefined,
  date: string | null | undefined
) {
  if (year != null && Number.isFinite(year)) return String(year);
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return String(d.getFullYear());
}

export function ShopResultRow({ book, className }: Props) {
  const { cents: salePrice, discountPercent: discount } = resolveOurPrice(
    book.price_cents,
    book.discount_percent
  );
  const [primary, ...fallbacks] = coverSourcesForBook({
    cover_image_url: book.cover_image_url,
    isbn: book.isbn,
  });
  const published = formatPublishYear(book.publish_year, book.published_at);
  const metaParts = [book.category_name, published].filter(Boolean);

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-md border border-[#E5E7EB] bg-white sm:flex-row",
        className
      )}
    >
      {book.is_featured && (
        <span className="absolute left-0 top-0 z-10 bg-[#111827] px-2.5 py-1 font-label text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-white">
          Featured
        </span>
      )}

      <Link
        href={`/shop/${book.slug}`}
        className="relative mx-auto w-[140px] shrink-0 self-center p-5 sm:mx-0 sm:w-[160px]"
      >
        <div className="relative aspect-[3/4] overflow-hidden border border-[#E5E7EB] bg-[#F9FAFB]">
          <BookCover
            src={primary}
            fallbackSrcs={fallbacks}
            alt={`Cover of ${book.title}`}
            title={book.title}
            sizes="160px"
          />
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-center px-5 pb-5 sm:py-6 sm:pl-0 sm:pr-6">
        <h3 className="font-display text-xl font-semibold leading-snug text-[#111827] md:text-2xl">
          <Link href={`/shop/${book.slug}`} className="hover:text-oxblood">
            {book.title}
          </Link>
        </h3>
        <p className="mt-2 font-body text-base text-[#374151]">{book.author}</p>
        {metaParts.length > 0 && (
          <p className="mt-1 font-body text-sm text-[#6B7280]">
            {metaParts.join(" | ")}
          </p>
        )}
        {book.stock <= 0 && (
          <p className="mt-2 font-label text-[0.65rem] uppercase tracking-[0.12em] text-oxblood">
            Out of stock
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col justify-center border-t border-[#E5E7EB] px-6 py-5 sm:w-[220px] sm:border-l sm:border-t-0 sm:py-6 md:w-[240px]">
        <p className="font-body text-sm italic text-[#6B7280]">Print</p>
        <p className="mt-2 font-body text-sm text-[#374151]">
          Starting at{" "}
          <span className="font-semibold text-[#111827]">
            {formatPrice(salePrice)}
          </span>
        </p>
        {discount > 0 && (
          <p className="mt-1 font-body text-xs text-[#6B7280] line-through">
            {formatPrice(book.price_cents)}
          </p>
        )}
        <Link
          href={`/shop/${book.slug}`}
          className="label-caps mt-4 inline-flex items-center justify-center gap-1 rounded bg-[#00C853] px-4 py-3 text-[0.68rem] font-semibold text-white transition hover:bg-[#00A844]"
        >
          See details
          <span aria-hidden>&rsaquo;</span>
        </Link>
      </div>
    </article>
  );
}

function RowSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-md border border-[#E5E7EB] bg-white sm:flex-row">
      <div className="mx-auto w-[140px] p-5 sm:mx-0">
        <div className="aspect-[3/4] bg-[#E5E7EB]" />
      </div>
      <div className="flex-1 space-y-3 px-5 pb-5 sm:py-6">
        <div className="h-6 w-3/4 bg-[#E5E7EB]" />
        <div className="h-4 w-1/3 bg-[#F3F4F6]" />
        <div className="h-4 w-1/2 bg-[#F3F4F6]" />
      </div>
      <div className="space-y-3 border-t border-[#E5E7EB] px-6 py-5 sm:w-[220px] sm:border-l sm:border-t-0">
        <div className="h-4 w-16 bg-[#F3F4F6]" />
        <div className="h-5 w-24 bg-[#E5E7EB]" />
        <div className="h-11 w-full rounded bg-[#E5E7EB]" />
      </div>
    </div>
  );
}

ShopResultRow.Skeleton = RowSkeleton;
