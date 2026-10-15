-- PART 0: setup
-- Run FIRST in a fresh SQL Editor tab. Keep that tab open for all later parts.

-- Allied Book Co. stock update from WEB SITE STOCK.xls
-- Generated: 2026-09-20T09:56:29.072Z
-- Unique codes: 6605 (from 9345 rows; duplicate codes summed)
--
-- HOW TO RUN IN SUPABASE SQL EDITOR:
-- 1. Open SQL Editor
-- 2. Paste/run this file (if it times out, run CREATE+INSERTs first, then APPLY section)
-- 3. Check the verification SELECT at the bottom
--
-- Matching: books.metadata->>'sku' = CODE
-- Fallback: isbn / isbn13 when sku is missing on the book row

-- Ensure columns used by the storefront import exist
ALTER TABLE books ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE books ADD COLUMN IF NOT EXISTS format text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS isbn13 text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS publish_year integer;
ALTER TABLE books ADD COLUMN IF NOT EXISTS published_at date;

-- Real table (not TEMP): Supabase SQL Editor often uses a new DB connection
-- per Run, so TEMP tables disappear between split parts.
DROP TABLE IF EXISTS public.stock_staging;

CREATE TABLE public.stock_staging (
  code text PRIMARY KEY,
  isbn text,
  title text,
  author text,
  publisher text,
  bind text,
  format text,
  publish_year integer,
  currency text,
  source_price numeric,
  conversion_rate numeric,
  pak_rs numeric,
  price_cents integer,
  stock integer not null default 0,
  subject text,
  sub_subject text
);

TRUNCATE public.stock_staging;
