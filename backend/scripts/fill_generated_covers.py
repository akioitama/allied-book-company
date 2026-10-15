"""Fill remaining null covers with branded generated images.

These are titles free providers don't have (mostly local editions). After the
main sync has already tried OL/Google/Archive, run this to eliminate
placeholders:

  .venv\\Scripts\\python -m scripts.fill_generated_covers
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402
from app.services.cover_generate import try_generate  # noqa: E402
from app.services.cover_pipeline import (  # noqa: E402
    REQUEST_TIMEOUT,
    ensure_bucket,
    upload_cover,
    CoverHit,
    _patch_book,
    metadata_columns_available,
)
from datetime import datetime, timezone  # noqa: E402


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    base = settings.supabase_url.rstrip("/")
    key = settings.supabase_service_role_key
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    stored = failed = 0

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        await ensure_bucket(client)
        with_meta = await metadata_columns_available(client)

        rows: list[dict] = []
        offset = 0
        while True:
            res = await client.get(
                f"{base}/rest/v1/books",
                params={
                    "select": "id,title,author",
                    "cover_image_url": "is.null",
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

        print(f"null covers to generate: {len(rows)}", flush=True)
        sem = asyncio.Semaphore(8)

        async def one(row: dict) -> None:
            nonlocal stored, failed
            async with sem:
                data = try_generate(row.get("title") or "", row.get("author"))
                if not data:
                    failed += 1
                    return
                hit = CoverHit(data, "image/jpeg", "generated")
                url = await upload_cover(client, row["id"], hit)
                if not url:
                    failed += 1
                    return
                payload = {"cover_image_url": url}
                if with_meta:
                    payload["cover_source"] = "generated"
                    payload["cover_checked_at"] = datetime.now(timezone.utc).isoformat()
                if await _patch_book(client, row["id"], payload):
                    stored += 1
                    if stored <= 10 or stored % 50 == 0:
                        print(f"  [{stored}] {row['title'][:55]}", flush=True)
                else:
                    failed += 1

        await asyncio.gather(*[one(r) for r in rows])

    print(f"Done. stored={stored} failed={failed}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
