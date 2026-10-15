"""Convert Allied Book STOCK LIST.xlsx into Supabase-ready CSVs."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

SRC = Path(r"c:\Users\LENOVO\Downloads\STOCK LIST.xlsx")
OUT_BOOKS = Path(r"c:\Users\LENOVO\Downloads\books_supabase.csv")
OUT_FULL = Path(r"c:\Users\LENOVO\Downloads\stock_list_cleaned.csv")
OUT_PUBS = Path(r"c:\Users\LENOVO\Downloads\publishers_supabase.csv")


def clean_str(v):
    if pd.isna(v):
        return None
    s = str(v).strip()
    if not s or s.lower() in {"nan", "none"}:
        return None
    return s


def slugify(title: str, code: str) -> str:
    base = title.lower()
    base = re.sub(r"[^a-z0-9]+", "-", base)
    base = re.sub(r"-{2,}", "-", base).strip("-")
    if not base:
        base = "book"
    base = base[:90]
    code_part = re.sub(r"[^a-z0-9]+", "-", code.lower()).strip("-")
    return f"{base}-{code_part}"


def map_format(bind) -> str:
    if bind is None:
        return "other"
    b = str(bind).strip().upper()
    if b in {"PB", "PBT", "PBS", "PA", "PH"}:
        return "paperback"
    if b.startswith("HB"):
        return "hardcover"
    return "other"


def clean_isbn(v):
    if pd.isna(v):
        return None
    if isinstance(v, float):
        s = str(int(v)) if v.is_integer() else str(v).strip()
    else:
        s = str(v).strip()
        if s.endswith(".0"):
            s = s[:-2]
    s = re.sub(r"[^0-9Xx]", "", s)
    return s or None


def year_to_date(y):
    if pd.isna(y):
        return None
    try:
        yi = int(float(y))
        if 1800 <= yi <= 2100:
            return f"{yi:04d}-01-01"
    except Exception:
        return None
    return None


def main() -> None:
    df = pd.read_excel(SRC, header=0)
    df.columns = [str(c).strip() for c in df.columns]

    rows = []
    full_rows = []
    seen_slugs: set[str] = set()
    publishers: dict[str, str] = {}

    for _, r in df.iterrows():
        code = clean_str(r["CODE #"]) or "unknown"
        title = clean_str(r["TITLE"]) or "Untitled"
        author = clean_str(r["AUTHOR"]) or "N/A"
        publisher = clean_str(r["PUBLISHER"])
        isbn = clean_isbn(r["ISBN"])
        bind = clean_str(r["BIND"])
        fmt = map_format(bind)
        published_at = year_to_date(r["YEAR"])

        try:
            stock = int(float(r["QTY"]))
        except Exception:
            stock = 0

        try:
            pak = float(r["PAK RS"])
        except Exception:
            pak = 0.0

        # PKR as integer paisa: Rs 795.00 -> 79500
        price_cents = int(round(max(pak, 0) * 100))

        slug = slugify(title, code)
        if slug in seen_slugs:
            slug = f"{slug}-{len(seen_slugs)}"
        seen_slugs.add(slug)

        isbn13 = isbn if isbn and len(isbn) == 13 else None
        isbn_main = isbn13 or isbn

        meta = {
            "sku": code,
            "publisher_name": publisher,
            "bind_raw": bind,
            "source_currency": clean_str(r["CUR"]),
            "source_price": None if pd.isna(r["PRICE"]) else float(r["PRICE"]),
            "conversion_rate": None if pd.isna(r["CON.RATE"]) else float(r["CON.RATE"]),
            "pak_rs": pak,
        }

        if publisher:
            pub_slug = re.sub(r"[^a-z0-9]+", "-", publisher.lower()).strip("-")[:80] or "publisher"
            publishers[pub_slug] = publisher

        rows.append(
            {
                "slug": slug,
                "title": title,
                "author": author,
                "description": "",
                "price_cents": price_cents,
                "currency": "PKR",
                "cover_image_url": "",
                "isbn": isbn_main or "",
                "isbn13": isbn13 or "",
                "language": "en",
                "published_at": published_at or "",
                "format": fmt,
                "stock": max(stock, 0),
                "discount_percent": 0,
                "is_featured": "false",
                "is_new": "false",
                "is_bestseller": "false",
                "is_active": "true",
                "metadata": json.dumps(meta, ensure_ascii=False),
            }
        )

        full_rows.append(
            {
                "sku": code,
                "isbn": isbn_main or "",
                "author": author,
                "title": title,
                "format": fmt,
                "year": "" if pd.isna(r["YEAR"]) else r["YEAR"],
                "publisher": publisher or "",
                "source_currency": clean_str(r["CUR"]) or "",
                "source_price": "" if pd.isna(r["PRICE"]) else r["PRICE"],
                "qty": stock,
                "pak_rs": pak,
                "price_cents": price_cents,
                "slug": slug,
            }
        )

    books = pd.DataFrame(rows)
    books.to_csv(OUT_BOOKS, index=False, encoding="utf-8")
    pd.DataFrame(full_rows).to_csv(OUT_FULL, index=False, encoding="utf-8")
    pd.DataFrame(
        [{"slug": s, "name": n} for s, n in sorted(publishers.items(), key=lambda x: x[1])]
    ).to_csv(OUT_PUBS, index=False, encoding="utf-8")

    print(f"books rows: {len(books)}")
    print(f"unique slugs: {books['slug'].nunique()}")
    print(f"publishers: {len(publishers)}")
    print(f"Saved: {OUT_BOOKS}")
    print(f"Saved: {OUT_FULL}")
    print(f"Saved: {OUT_PUBS}")


if __name__ == "__main__":
    main()
