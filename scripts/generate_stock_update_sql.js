/**
 * Generate Supabase stock-update SQL from WEB SITE STOCK.xls
 * Usage: node scripts/generate_stock_update_sql.js
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("../frontend/node_modules/xlsx");

const SRC = "C:/Users/LENOVO/Downloads/WEB SITE STOCK.xls";
const OUT_DIR = path.join(__dirname, "..", "supabase", "stock-update-2026-09");

fs.mkdirSync(OUT_DIR, { recursive: true });

const wb = XLSX.readFile(SRC);
const raw = XLSX.utils.sheet_to_json(wb.Sheets.Sheet1, { defval: null });

function cleanStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "nan" || s.toLowerCase() === "none") return null;
  return s;
}

function cleanIsbn(v) {
  if (v == null) return null;
  let s = typeof v === "number" ? String(Math.trunc(v)) : String(v).trim();
  if (s.endsWith(".0")) s = s.slice(0, -2);
  s = s.replace(/[^0-9Xx]/g, "");
  return s || null;
}

function mapCurrency(rawCur) {
  const c = cleanStr(rawCur) || "";
  const map = {
    $: "USD",
    "£": "GBP",
    RS: "PKR",
    IRS: "INR",
    EUR: "EUR",
    "ST.EUR": "EUR",
    SF: "CHF",
    "ST£": "GBP",
    "ST$": "USD",
  };
  return map[c] || (c ? c.toUpperCase() : null);
}

function mapFormat(bind) {
  if (!bind) return "other";
  const b = String(bind).trim().toUpperCase();
  if (["PB", "PBT", "PBS", "PA", "PH"].includes(b)) return "paperback";
  if (b.startsWith("HB")) return "hardcover";
  return "other";
}

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sqlStr(v) {
  if (v == null) return "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function sqlNum(v) {
  if (v == null || !Number.isFinite(v)) return "NULL";
  return String(v);
}

const byCode = new Map();
let skipped = 0;

for (const r of raw) {
  const code = cleanStr(r.CODE);
  if (!code) {
    skipped += 1;
    continue;
  }
  const qty = Math.max(0, Math.round(num(r["QTY AVAIALBLE"]) || 0));
  const pak = num(r["PAK RS"]);
  const fx = num(r.Bind); // Excel mislabel: foreign price
  const rate = num(r["Ins Conv."]);
  const currency = mapCurrency(r["Book Title"]); // Excel mislabel: currency
  const bind = cleanStr(r.BIND);
  const year = cleanStr(r.YEAR);
  let publishYear = null;
  if (year) {
    const y = parseInt(year, 10);
    if (y >= 1800 && y <= 2100) publishYear = y;
  }

  const row = {
    code,
    isbn: cleanIsbn(r.ISBN),
    author: cleanStr(r.AUTHOR) || "N/A",
    title: cleanStr(r.TITLE) || "Untitled",
    publisher: cleanStr(r.PUBLISHER),
    bind,
    format: mapFormat(bind),
    publish_year: publishYear,
    currency,
    source_price: fx,
    conversion_rate: rate,
    pak_rs: pak,
    price_cents: pak != null ? Math.max(0, Math.round(pak * 100)) : null,
    stock: qty,
    subject: cleanStr(r.SUBJECT),
    sub_subject: cleanStr(r["SUB SUBJECT"]),
  };

  const existing = byCode.get(code);
  if (!existing) {
    byCode.set(code, row);
  } else {
    existing.stock += qty;
    if (
      (existing.price_cents == null || existing.price_cents === 0) &&
      row.price_cents
    ) {
      const stock = existing.stock;
      Object.assign(existing, row);
      existing.stock = stock;
    }
  }
}

const rows = [...byCode.values()];
console.log(
  `raw=${raw.length} unique_codes=${rows.length} skipped_no_code=${skipped}`
);

const csvHeader = [
  "code",
  "isbn",
  "title",
  "author",
  "publisher",
  "bind",
  "format",
  "publish_year",
  "currency",
  "source_price",
  "conversion_rate",
  "pak_rs",
  "price_cents",
  "stock",
  "subject",
  "sub_subject",
];
const csvLines = [csvHeader.join(",")];
for (const r of rows) {
  csvLines.push(
    csvHeader
      .map((k) => {
        const v = r[k];
        if (v == null) return "";
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(",")
  );
}
fs.writeFileSync(path.join(OUT_DIR, "stock_staging.csv"), csvLines.join("\n"), "utf8");

const parts = [];
parts.push(`-- Allied Book Co. stock update from WEB SITE STOCK.xls
-- Generated: ${new Date().toISOString()}
-- Unique codes: ${rows.length} (from ${raw.length} rows; duplicate codes summed)
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
`);

const BATCH = 200;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const values = batch
    .map((r) =>
      [
        sqlStr(r.code),
        sqlStr(r.isbn),
        sqlStr(r.title),
        sqlStr(r.author),
        sqlStr(r.publisher),
        sqlStr(r.bind),
        sqlStr(r.format),
        sqlNum(r.publish_year),
        sqlStr(r.currency),
        sqlNum(r.source_price),
        sqlNum(r.conversion_rate),
        sqlNum(r.pak_rs),
        sqlNum(r.price_cents),
        sqlNum(r.stock),
        sqlStr(r.subject),
        sqlStr(r.sub_subject),
      ].join(",")
    )
    .map((v) => `(${v})`)
    .join(",\n");

  parts.push(`INSERT INTO stock_staging (
  code, isbn, title, author, publisher, bind, format, publish_year,
  currency, source_price, conversion_rate, pak_rs, price_cents, stock, subject, sub_subject
) VALUES
${values}
ON CONFLICT (code) DO UPDATE SET
  stock = EXCLUDED.stock,
  price_cents = COALESCE(EXCLUDED.price_cents, stock_staging.price_cents);
`);
}

parts.push(`
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
`);

const sqlPath = path.join(OUT_DIR, "01_apply_stock_update.sql");
fs.writeFileSync(sqlPath, parts.join("\n"), "utf8");

const readme = `# Stock update — WEB SITE STOCK.xls

Generated from \`WEB SITE STOCK.xls\` (${raw.length} rows → ${rows.length} unique CODE values).

## Files
- \`01_apply_stock_update.sql\` — run in Supabase SQL Editor
- \`stock_staging.csv\` — same data as CSV (optional)

## What it updates
For each matched book:
- \`stock\` (from QTY AVAIALBLE; duplicate CODEs are summed)
- \`price_cents\` (from PAK RS × 100)
- \`format\`, \`publish_year\`, \`isbn\` / \`isbn13\`
- \`metadata\`: sku, bind_raw, source_currency, source_price, conversion_rate, pak_rs, subject, sub_subject, publisher_name

## Match order
1. \`books.metadata->>'sku' = CODE\`
2. else ISBN / ISBN13 when sku is empty

## Notes
- Excel columns are mislabeled: **Book Title** = currency, **Bind** (2nd) = foreign price, **Ins Conv.** = conversion rate.
- New titles that are not already in \`books\` are **not inserted** by this script — only existing rows are updated.
- If the SQL editor times out, split: run CREATE + INSERT batches first, then the UPDATE block.
`;

fs.writeFileSync(path.join(OUT_DIR, "README.md"), readme, "utf8");

console.log("Wrote", sqlPath);
console.log("Size MB", (fs.statSync(sqlPath).size / 1024 / 1024).toFixed(2));
console.log("CSV", path.join(OUT_DIR, "stock_staging.csv"));
