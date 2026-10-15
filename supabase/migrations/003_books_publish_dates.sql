-- Publication dates for catalog filtering and display.
alter table books
  add column if not exists published_at date;

-- Backfill publish_year from published_at when the cover pipeline hasn't set it yet.
update books
set publish_year = extract(year from published_at)::integer
where publish_year is null
  and published_at is not null;

create index if not exists books_publish_year_idx
  on books (publish_year)
  where publish_year is not null;

create index if not exists books_published_at_idx
  on books (published_at)
  where published_at is not null;
