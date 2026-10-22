"use client";

import Link from "next/link";
import { BookCover } from "@/components/books/BookCover";
import { coverSourcesForBook } from "@/lib/books/covers";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils";
import { deliveryFeeCents, orderTotalCents } from "@/lib/shipping";
import { useCartStore } from "@/lib/store/cart";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const totalCents = useCartStore((s) => s.totalCents);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = totalCents();
  const delivery = deliveryFeeCents(subtotal);
  const grandTotal = orderTotalCents(subtotal);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <EmptyState
          title="Your cart is empty"
          body="Browse the shop and add books to your cart to continue."
          ctaHref="/shop"
          ctaLabel="Browse the shop"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
      <p className="eyebrow mb-3">Shopping cart</p>
      <h1 className="font-display text-4xl text-ink md:text-5xl">Your Cart</h1>
      <p className="mt-3 max-w-xl font-body text-lg text-ink-soft">
        {count} item{count === 1 ? "" : "s"} · update quantities before checkout
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
        <ul className="space-y-4">
          {items.map((item) => {
            const [primary, ...fallbacks] = coverSourcesForBook({
              cover_image_url: item.cover_image_url,
            });
            return (
              <li
                key={item.bookId}
                className="map-panel grid grid-cols-[72px_1fr] gap-4 p-4 sm:grid-cols-[88px_1fr_auto]"
              >
                <Link
                  href={`/shop/${item.slug}`}
                  className="relative aspect-[3/4] overflow-hidden"
                >
                  <BookCover
                    src={primary}
                    fallbackSrcs={fallbacks}
                    alt=""
                    title={item.title}
                    sizes="88px"
                  />
                </Link>
                <div>
                  <Link
                    href={`/shop/${item.slug}`}
                    className="mt-1 block font-display text-xl hover:text-oxblood"
                  >
                    {item.title}
                  </Link>
                  <p className="text-ink-soft">{item.author}</p>
                  <p className="mt-1 font-body text-sm text-ink-soft">
                    {formatPrice(item.price_cents)} each
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center border border-brass/50">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          setQuantity(item.bookId, item.quantity - 1)
                        }
                        className="px-3 py-1.5 font-body text-ink hover:bg-brass/10"
                      >
                        −
                      </button>
                      <span className="min-w-[2rem] text-center font-body text-sm tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          setQuantity(
                            item.bookId,
                            Math.min(20, item.quantity + 1)
                          )
                        }
                        className="px-3 py-1.5 font-body text-ink hover:bg-brass/10"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.bookId)}
                      className="label-caps text-[0.62rem] text-oxblood hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="font-display text-xl sm:text-right">
                  {formatPrice(item.price_cents * item.quantity)}
                </p>
              </li>
            );
          })}
        </ul>

        <aside className="map-panel h-fit p-6">
          <p className="eyebrow">Order summary</p>
          <div className="mt-4 space-y-2 font-body text-ink-soft">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{delivery > 0 ? formatPrice(delivery) : "Free"}</span>
            </div>
          </div>
          <p className="mt-3 font-display text-4xl text-ink">
            {formatPrice(grandTotal)}
          </p>
          <p className="mt-2 font-body text-sm text-ink-soft">
            {delivery > 0
              ? "Rs 200 delivery on orders under Rs 8,000."
              : "Free delivery on orders of Rs 8,000 or more."}
          </p>
          <Link
            href="/checkout"
            className="label-caps mt-6 flex justify-center border border-oxblood bg-oxblood px-5 py-3 text-[0.7rem] text-parchment transition hover:bg-ink"
          >
            Proceed to checkout
          </Link>
          <Link
            href="/shop"
            className="label-caps mt-3 flex justify-center border border-brass/40 px-5 py-3 text-[0.7rem] text-ink transition hover:border-oxblood hover:text-oxblood"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
