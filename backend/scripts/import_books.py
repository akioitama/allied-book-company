"""Bulk-import books and attach Google Books cover URLs.

Usage (from backend/):
  .venv\\Scripts\\python -m scripts.import_books path/to/books.json

JSON shape:
  [
    {
      "title": "...",
      "author": "...",
      "isbn": "9780143127550",
      "price_cents": 2499,
      "category_id": "...",
      "description": "..."
    }
  ]

Adds a delay between Google Books requests to stay within fair-use.
Test with a handful of real ISBNs before a full catalog run.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Allow `python -m scripts.import_books` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.supabase_client import get_supabase
from app.services.cover_service import fetch_cover_url


def slugify(title: str) -> str:
    raw = "".join(ch.lower() if ch.isalnum() else "-" for ch in title.strip())
    while "--" in raw:
        raw = raw.replace("--", "-")
    return raw.strip("-") or "book"


async def import_books(path: Path, delay: float) -> None:
    rows = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise SystemExit("JSON must be an array of book objects")

    supabase = get_supabase()
    if not supabase:
        raise SystemExit("Supabase is not configured — set SUPABASE_URL and service key")

    for i, row in enumerate(rows):
        title = row["title"]
        author = row["author"]
        isbn = row.get("isbn")
        cover = await fetch_cover_url(isbn, title, author)

        payload = {
            "slug": row.get("slug") or slugify(title),
            "title": title,
            "author": author,
            "description": row.get("description"),
            "price_cents": row["price_cents"],
            "cover_image_url": cover,
            "isbn": isbn,
            "category_id": row.get("category_id"),
            "stock": row.get("stock", 0),
            "is_featured": row.get("is_featured", False),
            "waypoint_order": row.get("waypoint_order"),
        }
        payload = {k: v for k, v in payload.items() if v is not None or k == "cover_image_url"}
        supabase.table("books").upsert(payload, on_conflict="slug").execute()
        print(f"[{i + 1}/{len(rows)}] {title} → {cover or '(no cover)'}")

        if i < len(rows) - 1 and delay > 0:
            await asyncio.sleep(delay)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import books with Google cover URLs")
    parser.add_argument("json_path", type=Path)
    parser.add_argument(
        "--delay",
        type=float,
        default=0.35,
        help="Seconds between Google Books requests (default 0.35)",
    )
    args = parser.parse_args()
    asyncio.run(import_books(args.json_path, args.delay))


if __name__ == "__main__":
    main()
