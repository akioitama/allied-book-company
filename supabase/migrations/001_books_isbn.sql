-- Add ISBN for Google Books cover lookups
-- Safe to run on existing projects.

alter table books
  add column if not exists isbn text;

create index if not exists books_isbn_idx on books (isbn);
