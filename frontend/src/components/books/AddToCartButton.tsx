"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/types";
import { resolveOurPrice } from "@/lib/books/pricing";
import { useCartStore } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

type Props = {
  book: Book;
  compact?: boolean;
  className?: string;
  /** Show quantity stepper (detail page). */
  withQuantity?: boolean;
};

export function AddToCartButton({
  book,
  compact,
  className,
  withQuantity = false,
}: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const inCart = items.find((i) => i.bookId === book.id);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const outOfStock = book.stock <= 0;
  const maxQty = Math.max(1, Math.min(20, book.stock || 20));

  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(false), 2200);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  function handleAdd() {
    if (outOfStock) return;
    const { cents: price_cents } = resolveOurPrice(
      book.price_cents,
      book.discount_percent
    );
    addItem({ ...book, price_cents }, withQuantity ? qty : 1);
    setJustAdded(true);
  }

  if (outOfStock) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "label-caps cursor-not-allowed border border-brass/40 bg-brass/10 text-ink-soft",
          compact ? "px-2.5 py-1.5 text-[0.58rem]" : "px-5 py-3 text-[0.7rem]",
          className
        )}
      >
        Out of stock
      </button>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {withQuantity && (
        <div className="flex items-center border border-brass/50">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2.5 font-body text-ink hover:bg-brass/10"
          >
            −
          </button>
          <span className="min-w-[2rem] text-center font-body text-sm tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="px-3 py-2.5 font-body text-ink hover:bg-brass/10"
          >
            +
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className={cn(
          "label-caps inline-flex items-center justify-center gap-2 border transition",
          compact
            ? "flex-1 border-oxblood bg-oxblood px-2.5 py-2 text-[0.58rem] text-white hover:bg-forest"
            : "border-oxblood bg-oxblood px-5 py-3 text-[0.7rem] text-parchment hover:bg-ink",
          justAdded && "border-forest bg-forest text-parchment"
        )}
      >
        {!compact && !justAdded && (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <path
              d="M3 5h2l2.2 11h11.3l2-8H7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="20" r="1.2" fill="currentColor" />
            <circle cx="17" cy="20" r="1.2" fill="currentColor" />
          </svg>
        )}
        {justAdded
          ? "Added to cart"
          : compact
            ? "Add to cart"
            : inCart
              ? `Add more (${inCart.quantity} in cart)`
              : "Add to cart"}
      </button>
    </div>
  );
}
