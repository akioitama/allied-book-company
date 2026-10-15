"""Download Google-hosted covers into our book-covers bucket.

~5k catalog rows still point at books.google.com. Those often fail through
the Next.js image optimizer (or resolve to stubs), and the UI then showed
placeholders. Rehosting makes every cover a stable public storage URL.

  .venv\\Scripts\\python -m scripts.rehost_google_covers
  .venv\\Scripts\\python -m scripts.rehost_google_covers --limit 50
"""

from __future__ import annotations

import asyncio
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402
from app.services.cover_generate import try_generate  # noqa: E402
from app.services.cover_pipeline import (  # noqa: E402
    REQUEST_TIMEOUT,
    CoverHit,
    ensure_bucket,
    metadata_columns_available,
    upload_cover,
    validate_image,
    _patch_book,
)


def with_fife(url: str) -> str:
    if "fife=" in url:
        return url
    return url + ("&" if "?" in url else "?") + "fife=w800"


async def main_async(limit: int | None, concurrency: int) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    base = settings.supabase_url.rstrip("/")
    key = settings.supabase_service_role_key
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    stats = {"scanned": 0, "stored": 0, "generated": 0, "failed": 0}
    sem = asyncio.Semaphore(concurrency)

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
        await ensure_bucket(client)
        with_meta = await metadata_columns_available(client)

        rows: list[dict] = []
        offset = 0
        while True:
            res = await client.get(
                f"{base}/rest/v1/books",
                params={
                    "select": "id,title,author,cover_image_url",
                    "cover_image_url": "like.*books.google*",
                    "order": "id",
                    "limit": "1000",
                    "offset": str(offset),
                },
                headers=headers,
            )
            res.raise_for_status()
            batch = res.json()
            rows.extend(batch)
            if len(batch) < 1000:
                break
            offset += len(batch)

        if limit is not None:
            rows = rows[:limit]
        print(f"google covers to rehost: {len(rows)}", flush=True)

        async def one(row: dict) -> None:
            async with sem:
                stats["scanned"] += 1
                url = with_fife(row["cover_image_url"])
                hit: CoverHit | None = None
                try:
                    res = await client.get(url)
                    if res.status_code == 200:
                        ct = validate_image(res.content, url)
                        if ct:
                            hit = CoverHit(res.content, ct, "google")
                except httpx.HTTPError:
                    hit = None

                if not hit:
                    data = try_generate(row.get("title") or "", row.get("author"))
                    if data:
                        hit = CoverHit(data, "image/jpeg", "generated")
                        stats["generated"] += 1
                    else:
                        stats["failed"] += 1
                        return
                else:
                    stats["stored"] += 1

                stored = await upload_cover(client, row["id"], hit)
                if not stored:
                    stats["failed"] += 1
                    stats["stored"] -= 1 if hit.source == "google" else 0
                    if hit.source == "generated":
                        stats["generated"] -= 1
                    return

                payload = {"cover_image_url": stored}
                if with_meta:
                    payload["cover_source"] = hit.source
                    payload["cover_checked_at"] = datetime.now(timezone.utc).isoformat()
                await _patch_book(client, row["id"], payload)
                if stats["scanned"] % 100 == 0:
                    print(
                        f"... {stats['scanned']}/{len(rows)} "
                        f"google={stats['stored']} generated={stats['generated']} "
                        f"failed={stats['failed']}",
                        flush=True,
                    )

        await asyncio.gather(*[one(r) for r in rows])

    print(f"Done. {stats}", flush=True)


def main() -> None:
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--concurrency", type=int, default=10)
    args = p.parse_args()
    asyncio.run(main_async(args.limit, max(1, args.concurrency)))


if __name__ == "__main__":
    main()
