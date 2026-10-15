/**
 * Book cover source resolution — single source of truth for cover URLs.
 *
 * Source chain, in order of preference:
 * 1. Stored URL from Supabase (validated by scripts/refresh_covers_google.py),
 *    upgraded in place to the highest-resolution variant its host supports.
 * 2. Google Books content image by ISBN. `fife=w{N}` returns the real cover
 *    at up to ~300px wide (vs the 128px default). Missing covers return a
 *    128x170 stub that <BookCover> detects and skips. Note: zoom=2/3 must
 *    NOT be used — they return generic placeholder scans, not covers.
 * 3. Open Library ISBN cover (-L, the largest size). `default=false` forces
 *    a 404 for missing covers instead of a blank 1x1 gif, so the UI can
 *    fall through to the next source.
 *
 * <BookCover> walks this chain on error / stub detection and renders a
 * styled placeholder only when every source fails.
 */

/** Width hint for Google covers. Google currently caps output at ~300px. */
const GOOGLE_COVER_WIDTH = 800;

export function cleanIsbn(isbn?: string | null): string | null {
  if (!isbn) return null;
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  return clean || null;
}

/** Pull ISBN out of an Open Library /b/isbn/... cover URL when the column is empty. */
export function isbnFromCoverUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/b\/isbn\/([0-9Xx]+)(?:-|$|\?)/i);
  return match ? cleanIsbn(match[1]) : null;
}

/** Ensure Open Library cover URLs 404 instead of returning a blank 1x1 gif. */
export function withOpenLibraryDefaultFalse(url: string): string {
  if (!url.includes("covers.openlibrary.org")) return url;
  if (/[?&]default=/.test(url)) return url;
  return url.includes("?") ? `${url}&default=false` : `${url}?default=false`;
}

/** Request the largest real image a Google Books content URL can serve. */
export function withGoogleHighRes(url: string): string {
  if (!url.includes("books.google") || !url.includes("/books/content")) {
    return url;
  }
  if (/[?&]fife=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}fife=w${GOOGLE_COVER_WIDTH}`;
}

/** Normalize any stored cover URL to its best displayable form. */
export function upgradeCoverUrl(url: string): string {
  return withGoogleHighRes(withOpenLibraryDefaultFalse(url));
}

/** Open Library Covers API by ISBN (L = largest available). */
export function openLibraryCoverUrl(isbn?: string | null): string | null {
  const clean = cleanIsbn(isbn);
  if (!clean) return null;
  return `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg?default=false`;
}

/** Open Library Covers API by internal cover id (L = largest available). */
export function openLibraryCoverIdUrl(
  coverId?: string | number | null
): string | null {
  if (coverId == null || coverId === "") return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`;
}

/** Open Library Covers API by OLID, for future catalog data that carries one. */
export function openLibraryCoverOlidUrl(olid?: string | null): string | null {
  const clean = olid?.trim();
  if (!clean) return null;
  return `https://covers.openlibrary.org/b/olid/${clean}-L.jpg?default=false`;
}

/** Direct Google Books cover image by ISBN (no API key, high-res). */
export function googleBooksCoverUrl(isbn?: string | null): string | null {
  const clean = cleanIsbn(isbn);
  if (!clean) return null;
  return withGoogleHighRes(
    `https://books.google.com/books/content?vid=ISBN${clean}&printsec=frontcover&img=1&zoom=1&source=gbs_api`
  );
}

/**
 * Ordered, deduplicated list of cover URLs for a book.
 *
 * Our storage bucket is authoritative — never chain to Open Library after it
 * (OL 404s were advancing BookCover into the empty placeholder even when a
 * perfectly good stored cover existed, or after a transient Google blip).
 *
 * Google-hosted URLs: use the upgraded high-res variant only.
 * Null stored: try Google then OL by ISBN (BookCover skips stubs / 404s).
 */
export function coverSourcesForBook(opts: {
  cover_image_url?: string | null;
  isbn?: string | null;
}): string[] {
  const storedRaw = opts.cover_image_url?.trim() || null;
  const stored = storedRaw ? upgradeCoverUrl(storedRaw) : null;
  const isbn = cleanIsbn(opts.isbn) || isbnFromCoverUrl(storedRaw);
  const google = googleBooksCoverUrl(isbn);
  const ol = openLibraryCoverUrl(isbn);

  const isOurBucket = Boolean(
    storedRaw && storedRaw.includes("/book-covers/") && storedRaw.includes("/storage/")
  );

  let ordered: Array<string | null>;
  if (isOurBucket) {
    ordered = [stored];
  } else if (storedRaw && storedRaw.includes("books.google")) {
    ordered = [stored];
  } else if (stored) {
    // Other external (e.g. leftover OL) — allow Google as safer fallback.
    ordered = [stored, google];
  } else {
    ordered = [google, ol];
  }

  return ordered.filter(
    (value, index, arr): value is string =>
      Boolean(value) && arr.indexOf(value) === index
  );
}
