/** Free standard delivery when subtotal is Rs 8,000 or more. */
export const FREE_DELIVERY_MIN_CENTS = 8000 * 100;

/** Flat delivery fee below the free threshold (Rs 350). */
export const DELIVERY_FEE_CENTS = 350 * 100;

export function deliveryFeeCents(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return subtotalCents < FREE_DELIVERY_MIN_CENTS ? DELIVERY_FEE_CENTS : 0;
}

export function orderTotalCents(subtotalCents: number): number {
  return subtotalCents + deliveryFeeCents(subtotalCents);
}
