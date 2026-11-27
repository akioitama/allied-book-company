-- Subject catalog import — generated 2026-11-27T12:22:23.704Z
-- 6880 books matched by CODE, 15 by ISBN only.
-- Writes ONLY category_id, subject, sub_subject. Stock and price are untouched.

drop table if exists public.stock_staging;

create table public.stock_staging (
  code text primary key,
  isbn text,
  title text,
  subject text not null,
  sub_subject text not null,
  slug text not null
);

-- A previous import may have left rows behind; the table is new, so this is
-- only a safety net if the drop above was skipped.
truncate public.stock_staging;
