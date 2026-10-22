import type { Book } from "@/types";
import { createClient, createPublicClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { upgradeCoverUrl } from "@/lib/books/covers";
import { SITEWIDE_DISCOUNT_PERCENT } from "@/lib/books/pricing";

export type BookRow = {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  description: string | null;
  price_cents: number;
  cover_image_url: string | null;
  category_id: string | null;
  stock: number | null;
  is_featured: boolean | null;
  waypoint_order: number | null;
  isbn: string | null;
  isbn13?: string | null;
  discount_percent?: number | null;
  is_new?: boolean | null;
  is_bestseller?: boolean | null;
  published_at?: string | null;
  publish_year?: number | null;
  created_at?: string | null;
  format?: string | null;
  metadata?: unknown;
};

function parseMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function formatBindLabel(format: string | null | undefined): string | null {
  if (!format) return null;
  const f = format.toLowerCase();
  if (f === "paperback") return "Paperback";
  if (f === "hardcover") return "Hardcover";
  if (f === "other") return null;
  return format;
}

export function mapBookRow(
  row: BookRow,
  categoryById?: Map<string, CategoryRecord>
): Book {
  const isbn = row.isbn13 || row.isbn || null;
  // The stored URL, upgraded to its best variant (Google high-res, OL
  // default=false). Null stays null — the backend cover pipeline owns
  // resolution, and the UI shows a placeholder for books it couldn't cover.
  const storedRaw = row.cover_image_url?.trim() || null;
  const stored = storedRaw ? upgradeCoverUrl(storedRaw) : null;
  const category = row.category_id
    ? categoryById?.get(row.category_id) ?? null
    : null;
  const meta = parseMetadata(row.metadata);
  const bindRaw =
    typeof meta?.bind_raw === "string" ? meta.bind_raw.trim() : null;
  const publisherRaw =
    typeof meta?.publisher_name === "string"
      ? meta.publisher_name.trim()
      : typeof meta?.publisher === "string"
        ? meta.publisher.trim()
        : null;
  const sku =
    typeof meta?.sku === "string" ? meta.sku.trim() : null;
  const foreignCurrency =
    typeof meta?.source_currency === "string"
      ? meta.source_currency.trim()
      : null;
  const foreignPrice =
    typeof meta?.source_price === "number" && Number.isFinite(meta.source_price)
      ? meta.source_price
      : typeof meta?.source_price === "string" &&
          meta.source_price.trim() !== "" &&
          Number.isFinite(Number(meta.source_price))
        ? Number(meta.source_price)
        : null;
  const conversionRate =
    typeof meta?.conversion_rate === "number" &&
    Number.isFinite(meta.conversion_rate)
      ? meta.conversion_rate
      : typeof meta?.conversion_rate === "string" &&
          meta.conversion_rate.trim() !== "" &&
          Number.isFinite(Number(meta.conversion_rate))
        ? Number(meta.conversion_rate)
        : null;
  const formatLabel = formatBindLabel(row.format);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author?.trim() || "N/A",
    description: row.description?.trim() || "",
    price_cents: row.price_cents ?? 0,
    cover_image_url: stored,
    category_id: row.category_id ?? "",
    category_slug: category?.slug ?? null,
    category_name: category?.name ?? null,
    stock: row.stock ?? 0,
    is_featured: Boolean(row.is_featured),
    waypoint_order: row.waypoint_order ?? null,
    isbn,
    code: sku,
    discount_percent: row.discount_percent ?? 0,
    is_new: Boolean(row.is_new),
    is_bestseller: Boolean(row.is_bestseller),
    published_at:
      row.published_at ??
      (row.publish_year ? `${row.publish_year}-01-01` : null) ??
      null,
    publish_year: row.publish_year ?? null,
    format: row.format ?? null,
    bind: bindRaw || formatLabel || null,
    publisher: publisherRaw || null,
    foreign_currency: foreignCurrency,
    foreign_price: foreignPrice,
    conversion_rate: conversionRate,
  };
}

export type CategoryRecord = { id: string; slug: string; name: string };

let categoriesCache: { at: number; list: CategoryRecord[] } | null = null;
let categoriesInflight: Promise<CategoryRecord[]> | null = null;
const CATEGORIES_TTL_MS = 5 * 60 * 1000;

/** DB categories (source of truth), cached + deduplicated per runtime. */
export async function listCategories(
  client?: SupabaseClient | null
): Promise<CategoryRecord[]> {
  if (categoriesCache && Date.now() - categoriesCache.at < CATEGORIES_TTL_MS) {
    return categoriesCache.list;
  }
  if (categoriesInflight) return categoriesInflight;
  categoriesInflight = (async () => {
    try {
      const supabase = clientOrThrow(client);
      const { data, error } = await supabase
        .from("categories")
        .select("id,slug,name")
        .order("name", { ascending: true });
      if (error) {
        console.error("listCategories", error.message);
        return categoriesCache?.list ?? [];
      }
      categoriesCache = { at: Date.now(), list: (data as CategoryRecord[]) ?? [] };
      return categoriesCache.list;
    } finally {
      categoriesInflight = null;
    }
  })();
  return categoriesInflight;
}

async function categoryMaps(client?: SupabaseClient | null) {
  const list = await listCategories(client);
  return {
    bySlug: new Map(list.map((c) => [c.slug, c])),
    byId: new Map(list.map((c) => [c.id, c])),
  };
}

function clientOrThrow(client?: SupabaseClient | null) {
  const c = client ?? createPublicClient() ?? createClient();
  if (!c) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return c;
}

export type ListBooksOpts = {
  q?: string;
  author?: string;
  /** Publisher / brand (matches metadata.publisher_name). */
  brand?: string;
  /** Category slug (matches DB categories.slug). */
  category?: string;
  maxPriceCents?: number;
  page?: number;
  pageSize?: number;
  featured?: boolean;
  isNew?: boolean;
  bestseller?: boolean;
  onSale?: boolean;
  inStock?: boolean;
  publishYearMin?: number;
  publishAfter?: string;
  /** When true and q is set, rank featured/bestseller before title. */
  relevanceSort?: boolean;
  /** Skip the exact-count query when pagination totals aren't needed. */
  withCount?: boolean;
  orderBy?:
    | "title"
    | "created_at"
    | "stock"
    | "price_cents"
    | "published_at"
    | "publish_year"
    | "discount_percent";
  ascending?: boolean;
};

/** Card/list views don't need `description` — keeps payloads small. */
const LIST_COLUMNS =
  "id,slug,title,author,price_cents,cover_image_url,category_id,stock," +
  "is_featured,waypoint_order,isbn,isbn13,discount_percent,is_new," +
  "is_bestseller,published_at,publish_year,created_at,format,metadata";

/** Collapse near-duplicate catalog rows that share the same title. */
function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bookDedupeScore(book: Book): number {
  let score = 0;
  score += Math.min(Math.max(book.stock, 0), 5000);
  if (book.cover_image_url) score += 800;
  if (book.isbn) score += 200;
  if (book.publisher) score += 40;
  const author = book.author?.trim() ?? "";
  if (author && author !== "N/A") score += 60 + Math.min(author.length, 50);
  if (book.discount_percent && book.discount_percent > 0) score += 10;
  return score;
}

/** Keep one listing per title (prefer stocked / covered / fuller author). */
export function dedupeBooksByTitle(books: Book[]): Book[] {
  const best = new Map<string, Book>();
  for (const book of books) {
    const key = normalizeTitleKey(book.title);
    if (!key) continue;
    const prev = best.get(key);
    if (!prev || bookDedupeScore(book) > bookDedupeScore(prev)) {
      best.set(key, book);
    }
  }
  // Preserve first-seen order from the query (already sorted).
  const seen = new Set<string>();
  const out: Book[] = [];
  for (const book of books) {
    const key = normalizeTitleKey(book.title);
    if (!key || seen.has(key)) continue;
    const chosen = best.get(key);
    if (chosen) {
      seen.add(key);
      out.push(chosen);
    }
  }
  return out;
}

export async function listBooks(
  opts: ListBooksOpts = {},
  client?: SupabaseClient | null
): Promise<{ books: Book[]; total: number }> {
  const supabase = clientOrThrow(client);
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, opts.pageSize ?? 24));
  const from = (page - 1) * pageSize;
  // Over-fetch so title duplicates collapsed on this page still fill the grid.
  const fetchSize = Math.min(96, pageSize * 3);
  const to = from + fetchSize - 1;
  const withCount = opts.withCount ?? true;
  const { bySlug, byId } = await categoryMaps(client);

  let query = supabase
    .from("books")
    .select(LIST_COLUMNS, withCount ? { count: "exact" } : {});

  if (opts.category?.trim()) {
    const cat = bySlug.get(opts.category.trim());
    // Unknown shelf = no titles; never fall back to the whole catalog.
    if (!cat) return { books: [], total: 0 };
    query = query.eq("category_id", cat.id);
  }

  if (opts.q?.trim()) {
    const q = opts.q.trim().replace(/%/g, "");
    query = query.or(
      [
        `title.ilike.%${q}%`,
        `author.ilike.%${q}%`,
        `isbn.ilike.%${q}%`,
        `metadata->>publisher_name.ilike.%${q}%`,
        `metadata->>publisher.ilike.%${q}%`,
      ].join(",")
    );
  }
  if (opts.author?.trim()) {
    query = query.ilike("author", `%${opts.author.trim()}%`);
  }
  if (opts.brand?.trim()) {
    const brand = opts.brand.trim().replace(/%/g, "");
    // Publisher lives in metadata from the stock import (publisher_name).
    query = query.or(
      `metadata->>publisher_name.ilike.%${brand}%,metadata->>publisher.ilike.%${brand}%`
    );
  }
  if (opts.maxPriceCents != null) {
    query = query.lte("price_cents", opts.maxPriceCents);
  }
  if (opts.featured) query = query.eq("is_featured", true);
  if (opts.isNew) query = query.eq("is_new", true);
  if (opts.bestseller) query = query.eq("is_bestseller", true);
  // Sitewide promo counts as on sale for every title; only hit the DB
  // discount column when there is no storefront-wide percent off.
  if (opts.onSale && SITEWIDE_DISCOUNT_PERCENT <= 0) {
    query = query.gt("discount_percent", 0);
  }
  if (opts.inStock) query = query.gt("stock", 0);
  if (opts.publishYearMin != null && opts.publishAfter) {
    query = query.or(
      `publish_year.gte.${opts.publishYearMin},published_at.gte.${opts.publishAfter}`
    );
  }

  const orderBy = opts.orderBy ?? "title";
  const ascending = opts.ascending ?? orderBy === "title";
  if (opts.relevanceSort) {
    query = query
      .order("is_featured", { ascending: false })
      .order("is_bestseller", { ascending: false })
      .order("title", { ascending: true });
  } else if (orderBy === "publish_year") {
    // Catalog dates live on publish_year (bulk imports share created_at).
    query = query
      .order("publish_year", { ascending, nullsFirst: false })
      .order("published_at", { ascending, nullsFirst: false })
      .order("title", { ascending: true });
  } else {
    query = query.order(orderBy, { ascending, nullsFirst: false });
  }
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error("listBooks", error.message);
    throw new Error(error.message);
  }

  const rows = (data as unknown as BookRow[]) ?? [];
  const books = dedupeBooksByTitle(rows.map((row) => mapBookRow(row, byId))).slice(
    0,
    pageSize
  );
  return {
    books,
    total: count ?? books.length,
  };
}

export async function getBookBySlug(
  slug: string,
  client?: SupabaseClient | null
): Promise<Book | null> {
  const supabase = clientOrThrow(client);
  const [{ data, error }, { byId }] = await Promise.all([
    supabase.from("books").select("*").eq("slug", slug).limit(1).maybeSingle(),
    categoryMaps(client),
  ]);

  if (error) {
    console.error("getBookBySlug", error.message);
    return null;
  }
  if (!data) return null;
  return mapBookRow(data as BookRow, byId);
}

export async function getRelatedBooks(
  book: Book,
  limit = 6,
  client?: SupabaseClient | null
): Promise<Book[]> {
  const supabase = clientOrThrow(client);
  const { byId } = await categoryMaps(client);
  const titleKey = normalizeTitleKey(book.title);

  const finalize = (rows: BookRow[], excludeIds: Set<string>) =>
    dedupeBooksByTitle(rows.map((r) => mapBookRow(r, byId))).filter(
      (b) =>
        normalizeTitleKey(b.title) !== titleKey &&
        b.id !== book.id &&
        !excludeIds.has(b.id)
    );

  const related: Book[] = [];
  const seen = new Set<string>([book.id]);

  // 1) Prefer same-subject (category) titles.
  if (book.category_id) {
    const { data } = await supabase
      .from("books")
      .select(LIST_COLUMNS)
      .eq("category_id", book.category_id)
      .neq("id", book.id)
      .limit(limit * 4);
    for (const b of finalize((data as unknown as BookRow[]) ?? [], seen)) {
      related.push(b);
      seen.add(b.id);
      if (related.length >= limit) return related;
    }
  }

  // 2) Fill remaining slots (or all, if no subject) with same-author books.
  if (related.length < limit && book.author && book.author !== "N/A") {
    const { data } = await supabase
      .from("books")
      .select(LIST_COLUMNS)
      .ilike("author", book.author)
      .neq("id", book.id)
      .limit(limit * 4);
    for (const b of finalize((data as unknown as BookRow[]) ?? [], seen)) {
      related.push(b);
      seen.add(b.id);
      if (related.length >= limit) break;
    }
  }

  // 3) Still short? Fill with same-publisher books.
  if (related.length < limit && book.publisher?.trim()) {
    const publisher = book.publisher.trim().replace(/%/g, "");
    const { data } = await supabase
      .from("books")
      .select(LIST_COLUMNS)
      .or(
        `metadata->>publisher_name.ilike.%${publisher}%,metadata->>publisher.ilike.%${publisher}%`
      )
      .neq("id", book.id)
      .limit(limit * 4);
    for (const b of finalize((data as unknown as BookRow[]) ?? [], seen)) {
      related.push(b);
      seen.add(b.id);
      if (related.length >= limit) break;
    }
  }

  return related;
}

/** Homepage sections — falls back when flags are empty on imported stock. */
export async function getHomeSections(client?: SupabaseClient | null) {
  const supabase = clientOrThrow(client);

  const noCount = { pageSize: 16, withCount: false } as const;
  const [flaggedNew, flaggedBest, onSale, newest, byStock, catalog] =
    await Promise.all([
      listBooks({ ...noCount, isNew: true, orderBy: "created_at", ascending: false }, supabase),
      listBooks({ ...noCount, bestseller: true, orderBy: "stock", ascending: false }, supabase),
      listBooks({ ...noCount, onSale: true, orderBy: "discount_percent", ascending: false }, supabase),
      listBooks({ ...noCount, orderBy: "created_at", ascending: false }, supabase),
      listBooks({ ...noCount, orderBy: "stock", ascending: false }, supabase),
      listBooks({ ...noCount, orderBy: "title", ascending: true }, supabase),
    ]);

  return {
    newArrivals: flaggedNew.books.length ? flaggedNew.books : newest.books,
    bestsellers: flaggedBest.books.length ? flaggedBest.books : byStock.books,
    onSale: onSale.books,
    catalogPreview: catalog.books,
  };
}

export async function searchBooksSuggest(
  q: string,
  limit = 5,
  client?: SupabaseClient | null
): Promise<Book[]> {
  if (q.trim().length < 2) return [];
  const { books } = await listBooks(
    { q: q.trim(), pageSize: limit, orderBy: "title", ascending: true, withCount: false },
    client
  );
  return books;
}
