"""Read-only database integrity audit for the books catalog.

Reports:
- cover URL health (stored / google / open library / null)
- invalid or missing ISBNs
- duplicate title+author pairs
- missing metadata (price, description, author)
- category coverage and broken category_id references

Usage:
  python scripts/audit_db.py
"""

from __future__ import annotations

import os
import re
from collections import Counter
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / "backend" / ".env"


def load_env() -> None:
    if not ENV.exists():
        return
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def clean_isbn(raw: str | None) -> str | None:
    if not raw:
        return None
    s = re.sub(r"[^0-9Xx]", "", str(raw).strip())
    return s or None


def cover_kind(url: str | None) -> str:
    if not url:
        return "null"
    if "book-covers" in url and "supabase" in url:
        return "stored (our bucket)"
    if "books.google" in url or "googleusercontent" in url:
        return "google"
    if "/b/id/" in url:
        return "open library (cover id)"
    if "/b/isbn/" in url:
        return "open library (isbn)"
    return "other"


def main() -> None:
    load_env()
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base or not key:
        raise SystemExit("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}

    with httpx.Client(timeout=60.0) as client:
        cats = client.get(
            f"{base}/rest/v1/categories?select=id,slug", headers=headers
        ).json()
        cat_ids = {c["id"] for c in cats}
        cat_slug = {c["id"]: c["slug"] for c in cats}

        books: list[dict] = []
        offset = 0
        while True:
            res = client.get(
                f"{base}/rest/v1/books",
                params={
                    "select": (
                        "id,slug,title,author,isbn,isbn13,price_cents,"
                        "description,cover_image_url,category_id,stock"
                    ),
                    "order": "id",
                    "limit": "1000",
                    "offset": str(offset),
                },
                headers=headers,
            )
            res.raise_for_status()
            rows = res.json()
            books.extend(rows)
            if len(rows) < 1000:
                break
            offset += len(rows)

    total = len(books)
    print(f"books: {total}   categories: {len(cats)}\n")

    print("— cover URL health —")
    for kind, n in Counter(cover_kind(b["cover_image_url"]) for b in books).most_common():
        print(f"  {kind:26s} {n:5d}  ({n * 100 // total}%)")

    bad_isbn = []
    no_isbn = 0
    for b in books:
        isbn = clean_isbn(b.get("isbn13")) or clean_isbn(b.get("isbn"))
        if not isbn:
            no_isbn += 1
        elif len(isbn) not in (10, 13):
            bad_isbn.append((b["title"][:50], b.get("isbn"), b.get("isbn13")))
    print(f"\n— ISBNs —\n  missing: {no_isbn}   invalid length: {len(bad_isbn)}")
    for t, i, i13 in bad_isbn[:10]:
        print(f"    {t!r} isbn={i!r} isbn13={i13!r}")

    pairs = Counter(
        ((b["title"] or "").strip().upper(), (b["author"] or "").strip().upper())
        for b in books
    )
    dupes = {k: v for k, v in pairs.items() if v > 1}
    print(f"\n— duplicates (same title+author) —\n  groups: {len(dupes)}   "
          f"extra rows: {sum(v - 1 for v in dupes.values())}")
    for (t, a), v in list(sorted(dupes.items(), key=lambda kv: -kv[1]))[:10]:
        print(f"    x{v}  {t[:60]} / {a[:30]}")

    no_price = sum(1 for b in books if not b.get("price_cents"))
    no_desc = sum(1 for b in books if not (b.get("description") or "").strip())
    no_author = sum(
        1 for b in books
        if (b.get("author") or "").strip().upper() in ("", "N/A", "NA")
    )
    neg_stock = sum(1 for b in books if (b.get("stock") or 0) < 0)
    print(f"\n— metadata —\n  price=0/null: {no_price}   description empty: "
          f"{no_desc}   author missing: {no_author}   negative stock: {neg_stock}")

    broken_fk = [b for b in books if b["category_id"] and b["category_id"] not in cat_ids]
    uncategorized = sum(1 for b in books if not b["category_id"])
    print(f"\n— categories —\n  uncategorized: {uncategorized}   "
          f"broken category_id refs: {len(broken_fk)}")
    dist = Counter(
        cat_slug.get(b["category_id"], "?") for b in books if b["category_id"]
    )
    for slug, n in dist.most_common(15):
        print(f"    {slug:32s} {n}")


if __name__ == "__main__":
    main()
