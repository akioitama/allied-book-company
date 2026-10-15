-- PART: apply updates + verification
-- Run AFTER all insert parts, in the SAME SQL Editor session.

-- 1) Match by stock CODE stored in metadata.sku
UPDATE books b
SET
  stock = s.stock,
  price_cents = COALESCE(s.price_cents, b.price_cents),
  format = COALESCE(s.format, b.format),
  publish_year = COALESCE(s.publish_year, b.publish_year),
  published_at = COALESCE(
    CASE WHEN s.publish_year IS NOT NULL THEN make_date(s.publish_year, 1, 1) ELSE NULL END,
    b.published_at
  ),
  isbn = COALESCE(NULLIF(b.isbn, ''), s.isbn, b.isbn),
  isbn13 = CASE
    WHEN s.isbn IS NOT NULL AND length(s.isbn) = 13 THEN s.isbn
    ELSE b.isbn13
  END,
  metadata = COALESCE(b.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'sku', s.code,
    'publisher_name', s.publisher,
    'bind_raw', s.bind,
    'source_currency', s.currency,
    'source_price', s.source_price,
    'conversion_rate', s.conversion_rate,
    'pak_rs', s.pak_rs,
    'subject', s.subject,
    'sub_subject', s.sub_subject
  ))
FROM stock_staging s
WHERE b.metadata->>'sku' = s.code;

-- 2) Fallback match by ISBN when sku is missing
UPDATE books b
SET
  stock = s.stock,
  price_cents = COALESCE(s.price_cents, b.price_cents),
  format = COALESCE(s.format, b.format),
  publish_year = COALESCE(s.publish_year, b.publish_year),
  published_at = COALESCE(
    CASE WHEN s.publish_year IS NOT NULL THEN make_date(s.publish_year, 1, 1) ELSE NULL END,
    b.published_at
  ),
  metadata = COALESCE(b.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'sku', s.code,
    'publisher_name', s.publisher,
    'bind_raw', s.bind,
    'source_currency', s.currency,
    'source_price', s.source_price,
    'conversion_rate', s.conversion_rate,
    'pak_rs', s.pak_rs,
    'subject', s.subject,
    'sub_subject', s.sub_subject
  ))
FROM stock_staging s
WHERE (b.metadata->>'sku' IS NULL OR b.metadata->>'sku' = '')
  AND s.isbn IS NOT NULL
  AND (b.isbn = s.isbn OR b.isbn13 = s.isbn);

-- Verification
SELECT
  (SELECT count(*) FROM stock_staging) AS staging_rows,
  (SELECT count(*) FROM books b
     JOIN stock_staging s ON b.metadata->>'sku' = s.code) AS matched_by_sku,
  (SELECT count(*) FROM stock_staging s
     WHERE NOT EXISTS (
       SELECT 1 FROM books b WHERE b.metadata->>'sku' = s.code
     )
     AND NOT EXISTS (
       SELECT 1 FROM books b
       WHERE s.isbn IS NOT NULL AND (b.isbn = s.isbn OR b.isbn13 = s.isbn)
     )
  ) AS unmatched_codes;

-- Cleanup staging table when done
DROP TABLE IF EXISTS public.stock_staging;
