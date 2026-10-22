import { cache, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/books/AddToCartButton";
import { BookCover } from "@/components/books/BookCover";
import { CatalogCard } from "@/components/books/CatalogCard";
import { formatPrice } from "@/lib/utils";
import { coverSourcesForBook } from "@/lib/books/covers";
import { resolveForeignPrice } from "@/lib/books/foreign-price";
import { resolveOurPrice } from "@/lib/books/pricing";
import { getBookBySlug, getRelatedBooks } from "@/lib/books/supabase-books";
import type { Book } from "@/types";

type Props = { params: { slug: string } };

export const revalidate = 300;

const getBook = cache(async (slug: string) => {
  try {
    return await getBookBySlug(slug);
  } catch (e) {
    console.error(e);
    return null;
  }
});

export async function generateMetadata({ params }: Props) {
  const book = await getBook(params.slug);
  return { title: book?.title ?? "Book" };
}

function displayYear(book: Book) {
  if (book.publish_year) return String(book.publish_year);
  if (book.published_at) {
    const year = new Date(book.published_at).getFullYear();
    if (!Number.isNaN(year)) return String(year);
  }
  return "—";
}

function formatForeignPrice(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
  const code = currency.trim();
  return code ? `${code} ${formatted}` : formatted;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.75rem_1fr] items-baseline gap-x-3 border-b border-brass/20 py-1.5 last:border-0 sm:grid-cols-[7.5rem_1fr]">
      <dt className="font-label text-xs font-bold uppercase tracking-[0.14em] text-ink sm:text-sm">
        {label}
      </dt>
      <dd className="min-w-0 font-body text-sm text-ink sm:text-base">{value}</dd>
    </div>
  );
}

export default async function BookDetailPage({ params }: Props) {
  const book = await getBook(params.slug);
  if (!book) notFound();

  const categoryName = book.category_name ?? null;
  const related = await getRelatedBooks(book, 6);
  const { cents: salePrice, discountPercent: discount } = resolveOurPrice(
    book.price_cents,
    book.discount_percent
  );
  const foreign = await resolveForeignPrice({
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    stockAmount: book.foreign_price,
    stockCurrency: book.foreign_currency,
    conversionRate: book.conversion_rate,
  });
  const [primaryCover, ...coverFallbacks] = coverSourcesForBook({
    cover_image_url: book.cover_image_url,
    isbn: book.isbn,
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
      <p className="eyebrow mb-6">
        <Link href="/shop" className="hover:text-ink">
          Shop
        </Link>
        {" / "}
        {book.category_slug && categoryName ? (
          <Link
            href={`/shop?category=${book.category_slug}`}
            className="hover:text-ink"
          >
            {categoryName}
          </Link>
        ) : (
          "Catalog"
        )}
      </p>

      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:gap-10 md:gap-12">
          <div className="mx-auto w-[180px] shrink-0 self-start sm:mx-0 md:w-[200px]">
            <div className="map-panel relative aspect-[3/4] overflow-hidden">
              <BookCover
                src={primaryCover}
                fallbackSrcs={coverFallbacks}
                alt={`Cover of ${book.title}`}
                title={book.title}
                priority
                sizes="200px"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 self-start">
            <h1 className="font-display text-2xl leading-none text-ink sm:text-3xl md:text-[2rem]">
              {book.title}
            </h1>

            <dl className="mt-6">
              <DetailRow
                label="Author"
                value={
                  book.author && book.author !== "N/A" ? (
                    <Link
                      href={`/shop?author=${encodeURIComponent(book.author)}`}
                      className="text-oxblood hover:underline"
                    >
                      {book.author}
                    </Link>
                  ) : (
                    book.author
                  )
                }
              />
              <DetailRow label="Binding" value={book.bind ?? "—"} />
              <DetailRow
                label="Publisher"
                value={
                  book.publisher ? (
                    <Link
                      href={`/shop?brand=${encodeURIComponent(book.publisher)}`}
                      className="text-oxblood hover:underline"
                    >
                      {book.publisher}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow label="Year" value={displayYear(book)} />
              <DetailRow label="ISBN" value={book.isbn ?? "—"} />
              <DetailRow
                label="Price"
                value={
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                      <span>
                        <span className="mr-1.5 font-label text-xs font-bold uppercase tracking-[0.12em] text-ink">
                          Foreign
                        </span>
                        <span className="font-display text-lg">
                          {foreign
                            ? formatForeignPrice(
                                foreign.amount,
                                foreign.currency
                              )
                            : "—"}
                        </span>
                      </span>
                      <span>
                        <span className="mr-1.5 font-label text-xs font-bold uppercase tracking-[0.12em] text-ink">
                          PKR
                        </span>
                        <span className="font-display text-lg">
                          {formatPrice(book.price_cents)}
                        </span>
                      </span>
                    </div>
                    <span>
                      <span className="mr-1.5 font-label text-xs font-bold uppercase tracking-[0.12em] text-ink">
                        Your price
                      </span>
                      <span className="font-display text-lg text-oxblood">
                        {formatPrice(salePrice)}
                        {discount > 0 ? (
                          <span className="ml-1.5 font-body text-sm text-ink-soft">
                            ({discount}% off)
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </div>
                }
              />
              <DetailRow
                label="Subject"
                value={
                  book.category_slug && categoryName ? (
                    <Link
                      href={`/shop?category=${book.category_slug}`}
                      className="text-oxblood hover:underline"
                    >
                      {categoryName}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label="Stock"
                value={
                  book.stock > 0 ? (
                    <span className="text-forest">{book.stock} copies</span>
                  ) : (
                    <span className="text-oxblood">Out of stock</span>
                  )
                }
              />
            </dl>

            {book.description && (
              <p className="mt-6 font-body text-base leading-relaxed text-ink-soft">
                {book.description}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <AddToCartButton book={book} withQuantity />
              <Link
                href="/cart"
                className="label-caps border border-brass/50 px-5 py-3 text-[0.7rem] text-ink transition hover:border-oxblood hover:text-oxblood"
              >
                View cart
              </Link>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <p className="eyebrow mb-3">Related titles</p>
          <h2 className="font-display text-3xl text-ink">More from this shelf</h2>
          <div className="mt-8 flex flex-wrap gap-5 sm:gap-6">
            {related.map((b) => (
              <CatalogCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
