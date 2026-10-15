# Book Cover Management System

All automated cover work goes through one module:
`backend/app/services/cover_pipeline.py`. Nothing else in the codebase decides
where covers come from.

## How a cover is resolved

For each book the pipeline walks a provider chain until a **validated** image
is found (magic-byte check, minimum size, provider stub detection — Open
Library's blank 1×1 GIF and Google's 128×170 "no cover" stub are rejected):

1. Our Supabase Storage bucket (`book-covers`) — already cached, nothing to do
2. Open Library by stored cover id (fast, exact)
3. Open Library by ISBN (fast, exact)
4. Google Books static content URL by ISBN, `fife=w800` (fast, no API quota)
5. Google Books API — ISBN, then title+author; largest image link is used
   (`GOOGLE_BOOKS_API_KEY` in `backend/.env` raises the rate limit)
6. Open Library search by title+author (slow; also recovers metadata)
7. Internet Archive search by title+author (slow, last resort)

A winning image is downloaded, uploaded to the public `book-covers` bucket
keyed by book id (`{book_id}.jpg` — re-runs overwrite, never duplicate), and
the permanent public URL is written to `books.cover_image_url`. From then on
the book is served from our own storage and never hits external APIs again.

## Metadata enrichment

Run `supabase/migrations/002_book_cover_metadata.sql` once in the Supabase SQL
editor. It adds `openlibrary_id`, `ol_cover_id`, `subjects`, `publish_year`,
`cover_source`, and `cover_checked_at` to `books`. With those columns the
pipeline persists identifiers found during title/author search (making future
lookups instant), records which provider produced each cover, and stamps every
attempt so failed books are retried after `COVER_RETRY_DAYS` (default 7)
instead of on every pass. Without the migration the pipeline still works and
logs a warning; it just can't remember what it learned.

## Background synchronization

- **Inside the API**: the FastAPI app starts a background task on boot
  (`app/main.py` lifespan) that runs a sync pass every
  `COVER_SYNC_INTERVAL_HOURS` (default 6). Newly imported books get covers
  automatically with zero manual steps. Disable with `COVER_SYNC_ENABLED=false`.
- **CLI / worker**: `.venv\Scripts\python -m scripts.sync_covers --all`
  (single pass), `--loop 21600` (long-running worker), `--force` (ignore the
  retry schedule).
- **Single book**: `POST /admin/books/{id}/refresh-cover` runs the full
  pipeline for one book.

## Frontend contract

The pipeline is authoritative. `coverSourcesForBook`
(`frontend/src/lib/books/covers.ts`) returns:

- **no stored URL** → empty list; `BookCover` renders the branded placeholder
  immediately (no doomed external requests, no image-optimizer 404 noise);
- **stored URL** → that URL first (upgraded to its highest-res variant), with
  Google / Open Library rebuilt from the ISBN as client-side fallbacks against
  transient failures. `BookCover` detects stub images on load and advances
  through the chain.

Delivery is optimized by Next.js: WebP re-encoding, responsive `sizes`,
`minimumCacheTTL` of 31 days (`next.config.mjs`), and storage uploads carry
`Cache-Control: max-age=31536000`.

## Books with no free-source cover

About 4% of this catalog are local editions that never appear in Open Library,
Google Books, or Internet Archive. For those, the pipeline’s final provider
(`cover_generate.py`) creates a branded Allied cover (title + author) and
stores it in the same `book-covers` bucket (`cover_source = generated`).

One-shot fill after a sync that left nulls:

```
.venv\Scripts\python -m scripts.fill_generated_covers
```

Disable with `COVER_GENERATE_FALLBACK=false` if you only want real publisher art.


Write an `async def provider_x(client, book) -> CoverHit | None` in
`cover_pipeline.py` and add it to the `PROVIDERS` tuple in the right position
(fast/exact before slow/fuzzy). Providers must never raise — return `None` on
any failure; the orchestrator logs and moves on.
