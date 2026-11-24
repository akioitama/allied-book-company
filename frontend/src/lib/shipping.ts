/**
 * Cart pricing, including the e-book rules.
 *
 * - E-books are digital: never charged delivery.
 * - A cart with any e-book must be paid upfront (no cash on delivery).
 * - Delivery is charged on the whole order when it contains a physical item
 *   and the combined subtotal is below the free-delivery threshold.
 */

// Kept dependency-free (plain numbers, no Node APIs) so both the browser cart
// and the server-side order route can share exactly one set of rules.

/** Free standard delivery when subtotal is Rs 8,000 or more. */
export const FREE_DELIVERY_MIN_CENTS = 8000 * 100;

/** Flat delivery fee below the free threshold (Rs 350). */
export const DELIVERY_FEE_CENTS = 350 * 100;

/** Books in this shelf are sold as e-books: no delivery, upfront only. */
export const SCHOOL_BOOK_ISBNS = [
  "9781292368450",
  "9781292368467",
  "9781292764375",
  "9781292496993",
  "9781292764368",
  "9781292496719",
  "9781292368658",
  "9781292496900",
  "9781292370101",
  "9781292496726",
  "9781292496641",
  "9781292496665",
  "9781292394923",
  "9781292394916",
  "9781292394909",
];

const SCHOOL_BOOK_SET = new Set<string>(SCHOOL_BOOK_ISBNS);

/** ISBN without separators, uppercase X. */
export function normalizeIsbn(isbn?: string | null): string {
  return (isbn ?? "").replace(/[^0-9Xx]/g, "").toUpperCase();
}

/**
 * True when the ISBN belongs to an e-book.
 * A missing ISBN counts as physical — charging delivery by mistake is
 * recoverable, silently giving away shipping is not.
 */
export function isEbookIsbn(isbn?: string | null): boolean {
  const key = normalizeIsbn(isbn);
  return key !== "" && SCHOOL_BOOK_SET.has(key);
}

export type PricingLine = {
  price_cents: number;
  quantity: number;
  /** Digital product — no delivery, upfront payment only. */
  is_ebook?: boolean;
};

export type PaymentRule = "upfront" | "either";

export type CartPricing = {
  subtotalCents: number;
  physicalSubtotalCents: number;
  ebookSubtotalCents: number;
  hasEbooks: boolean;
  hasPhysical: boolean;
  deliveryCents: number;
  totalCents: number;
  payment: PaymentRule;
  /** Short, customer-facing explanation of the delivery line. */
  deliveryNote: string;
};

/** Delivery fee for a given subtotal (legacy shape: subtotal only). */
export function deliveryFeeCents(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return subtotalCents < FREE_DELIVERY_MIN_CENTS ? DELIVERY_FEE_CENTS : 0;
}

/** Total including delivery for a given subtotal (legacy shape). */
export function orderTotalCents(subtotalCents: number): number {
  return subtotalCents + deliveryFeeCents(subtotalCents);
}

export function cartPricing(lines: PricingLine[]): CartPricing {
  const subtotalCents = lines.reduce(
    (n, l) => n + l.price_cents * l.quantity,
    0
  );
  const ebookSubtotalCents = lines
    .filter((l) => l.is_ebook)
    .reduce((n, l) => n + l.price_cents * l.quantity, 0);
  const physicalSubtotalCents = subtotalCents - ebookSubtotalCents;

  const hasEbooks = ebookSubtotalCents > 0;
  const hasPhysical = physicalSubtotalCents > 0;

  // Delivery only applies to physical items, but the free-delivery threshold is
  // measured on the combined order total.
  const deliveryCents = hasPhysical
    ? deliveryFeeCents(subtotalCents)
    : 0;

  let deliveryNote: string;
  if (!hasPhysical && hasEbooks) {
    deliveryNote = "E-books are delivered digitally — no delivery charge.";
  } else if (subtotalCents === 0) {
    deliveryNote = "Nothing to deliver yet.";
  } else if (deliveryCents > 0) {
    deliveryNote = hasEbooks
      ? `Rs ${DELIVERY_FEE_CENTS / 100} delivery applies to the physical books in this order (free over Rs ${FREE_DELIVERY_MIN_CENTS / 100}).`
      : `Rs ${DELIVERY_FEE_CENTS / 100} delivery applies to orders under Rs ${FREE_DELIVERY_MIN_CENTS / 100}.`;
  } else {
    deliveryNote = "Free delivery.";
  }

  return {
    subtotalCents,
    physicalSubtotalCents,
    ebookSubtotalCents,
    hasEbooks,
    hasPhysical,
    deliveryCents,
    totalCents: subtotalCents + deliveryCents,
    payment: hasEbooks ? "upfront" : "either",
    deliveryNote,
  };
}

