-- Cover pipeline metadata (run in the Supabase SQL editor).
--
-- The cover pipeline (backend/app/services/cover_pipeline.py) works without
-- these columns, but with them it can:
--   * persist Open Library identifiers found during title/author search,
--     making future lookups instant and improving edition matching;
--   * record which provider a cover came from (debugging / analytics);
--   * stamp when each book was last checked, so failed books are retried on
--     a schedule instead of on every sync pass.

alter table books
  add column if not exists openlibrary_id text,
  add column if not exists ol_cover_id bigint,
  add column if not exists subjects jsonb,
  add column if not exists publish_year integer,
  add column if not exists cover_source text,
  add column if not exists cover_checked_at timestamptz;

-- The sync job scans "books with no cover, not checked recently".
create index if not exists books_cover_missing_idx
  on books (cover_checked_at)
  where cover_image_url is null;

comment on column books.cover_source is
  'Provider that produced cover_image_url (storage/google/openlibrary/internet_archive/...)';
comment on column books.cover_checked_at is
  'Last time the cover pipeline attempted to resolve a cover for this book';
