/**
 * Resolve international list prices via Google Books / stock metadata.
 * Foreign amounts are shown as-is — never inflated to beat Our price.
 */

export type ForeignPriceQuote = {
  amount: number;
  currency: string;
  source: "google_books" | "stock";
};

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";

/** Fallback PKR rates when stock conversion_rate is missing. */
const DEFAULT_PKR_RATES: Record<string, number> = {
  USD: 278,
  GBP: 355,
  EUR: 302,
  AUD: 182,
  CAD: 204,
  CHF: 315,
  SGD: 210,
  INR: 3.35,
  AED: 76,
  SAR: 74,
};

type GooglePrice = { amount: number; currencyCode: string };

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function extractGooglePrice(payload: unknown): GooglePrice | null {
  if (!payload || typeof payload !== "object") return null;
  const items = (payload as { items?: unknown[] }).items;
  if (!Array.isArray(items)) return null;

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const saleInfo = (item as { saleInfo?: Record<string, unknown> }).saleInfo;
    if (!saleInfo) continue;

    for (const key of ["listPrice", "retailPrice"] as const) {
      const price = saleInfo[key];
      if (!price || typeof price !== "object") continue;
      const amount = asFiniteNumber((price as { amount?: unknown }).amount);
      const currencyCode = (price as { currencyCode?: unknown }).currencyCode;
      if (
        amount != null &&
        amount > 0 &&
        typeof currencyCode === "string" &&
        currencyCode.trim()
      ) {
        return { amount, currencyCode: currencyCode.trim().toUpperCase() };
      }
      const micros = asFiniteNumber(
        (price as { amountInMicros?: unknown }).amountInMicros
      );
      if (
        micros != null &&
        micros > 0 &&
        typeof currencyCode === "string" &&
        currencyCode.trim()
      ) {
        return {
          amount: micros / 1_000_000,
          currencyCode: currencyCode.trim().toUpperCase(),
        };
      }
    }
  }
  return null;
}

export async function fetchGoogleBooksPrice(opts: {
  isbn?: string | null;
  title?: string | null;
  author?: string | null;
}): Promise<ForeignPriceQuote | null> {
  const queries: string[] = [];
  const isbn = opts.isbn?.replace(/[^0-9Xx]/g, "").trim();
  if (isbn) queries.push(`isbn:${isbn}`);

  const title = opts.title?.trim();
  if (title) {
    let q = `intitle:${title}`;
    const author = opts.author?.trim();
    if (author && author.toUpperCase() !== "N/A") {
      q += `+inauthor:${author}`;
    }
    queries.push(q);
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim() || "";

  for (const q of queries) {
    try {
      const url = new URL(GOOGLE_BOOKS_URL);
      url.searchParams.set("q", q);
      url.searchParams.set("country", "US");
      url.searchParams.set("maxResults", "3");
      url.searchParams.set("printType", "books");
      if (apiKey) url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString(), {
        next: { revalidate: 60 * 60 * 24 },
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const price = extractGooglePrice(data);
      if (price) {
        return {
          amount: price.amount,
          currency: price.currencyCode,
          source: "google_books",
        };
      }
    } catch {
      // Try next query / fall through
    }
  }
  return null;
}

export function pkrRateFor(
  currency: string,
  conversionRate?: number | null
): number {
  if (conversionRate != null && conversionRate > 0) return conversionRate;
  const code = currency.trim().toUpperCase();
  if (code === "PKR") return 1;
  return DEFAULT_PKR_RATES[code] ?? DEFAULT_PKR_RATES.USD;
}

export function foreignToPkr(
  amount: number,
  currency: string,
  conversionRate?: number | null
): number {
  return amount * pkrRateFor(currency, conversionRate);
}

/** Prefer stock sheet price when present; otherwise Google Books. Never invent/bump. */
export async function resolveForeignPrice(opts: {
  isbn?: string | null;
  title?: string;
  author?: string;
  stockAmount?: number | null;
  stockCurrency?: string | null;
  conversionRate?: number | null;
}): Promise<ForeignPriceQuote | null> {
  const stock: ForeignPriceQuote | null =
    opts.stockAmount != null &&
    opts.stockAmount > 0 &&
    opts.stockCurrency?.trim()
      ? {
          amount: opts.stockAmount,
          currency: opts.stockCurrency.trim().toUpperCase(),
          source: "stock",
        }
      : null;

  if (stock) return stock;

  return fetchGoogleBooksPrice({
    isbn: opts.isbn,
    title: opts.title,
    author: opts.author,
  });
}
