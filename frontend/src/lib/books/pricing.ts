/** Shared storefront pricing — every book is 15% off the PKR list. */

export const SITEWIDE_DISCOUNT_PERCENT = 15;

/**
 * Our selling price in cents.
 * Always applies at least 15% off. If a book already has a higher
 * discount_percent in the DB, that higher value wins.
 */
export function resolveOurPrice(
  priceCents: number,
  discountPercent?: number | null
): { cents: number; discountPercent: number } {
  const fromDb =
    discountPercent != null && discountPercent > 0 ? discountPercent : 0;
  const d = Math.max(SITEWIDE_DISCOUNT_PERCENT, fromDb);
  return {
    cents: Math.max(0, Math.round(priceCents * (1 - d / 100))),
    discountPercent: d,
  };
}
