"""Centralized book-cover pipeline: resolve, validate, store, and record.

Every automated cover operation goes through this module. For each book the
pipeline walks a provider chain until a *validated* image is found:

    1. our own Supabase Storage bucket (already-cached cover: nothing to do)
    2. Open Library by stored cover id            (fast, exact)
    3. Open Library by ISBN                       (fast, exact)
    4. Google Books static content URL by ISBN    (fast, no API quota)
    5. Google Books API (ISBN, then title+author) (quota'd, largest image)
    6. Open Library search by title+author        (slow; also yields metadata)
    7. Internet Archive by title+author           (slow, last resort)

A hit is downloaded, validated (magic bytes, minimum size, provider stub
detection), uploaded to the public `book-covers` bucket keyed by book id
(re-runs overwrite, never duplicate), and the permanent public URL is written
to books.cover_image_url. Metadata discovered along the way (Open Library id,
cover id, subjects, publish year, ISBN backfill) is persisted when the
002_book_cover_metadata.sql migration has been applied; otherwise the pipeline
still works and simply skips those fields.

Books that fail every provider are stamped (cover_checked_at) and retried
after `settings.cover_retry_days`, so the sync job never hammers the same
dead ends on every pass.

Entry points:
    resolve_and_store(book)   — full pipeline for one book dict
    sync_missing_covers(...)  — scan + fix books that need attention
    run_sync_forever(...)     — background loop used by the FastAPI app
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx

from app.core.config import settings
from app.services import cover_service

logger = logging.getLogger(__name__)

BUCKET = "book-covers"
REQUEST_TIMEOUT = httpx.Timeout(20.0, connect=8.0)
SEARCH_TIMEOUT = 10.0

# Anything at or below these byte sizes is a provider "no cover" stub.
OL_BLANK_MAX_BYTES = 100
GOOGLE_STUB_MAX_BYTES = 1320
MIN_REAL_IMAGE_BYTES = 1500

_METADATA_COLUMNS = (
    "openlibrary_id",
    "ol_cover_id",
    "subjects",
    "publish_year",
    "cover_source",
    "cover_checked_at",
)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def clean_isbn(raw: str | None) -> Optional[str]:
    if not raw:
        return None
    s = re.sub(r"[^0-9Xx]", "", str(raw).strip())
    return s if len(s) in (10, 13) else None


def isbn_from_cover_url(url: str | None) -> Optional[str]:
    if not url:
        return None
    m = re.search(r"/b/isbn/([0-9Xx]+)(?:-|$|\?)", url, re.I)
    return clean_isbn(m.group(1)) if m else None


def clean_title(title: str) -> str:
    """Strip regional/edition packaging noise that kills search matching.

    Local reprint titles like "LIPPINCOTT … PHARMACOLOGY SOUTH ASIAN 7TH ED"
    have no Open Library/Google hit under the full string, but the
    international edition ("Lippincott Illustrated Reviews Pharmacology")
    usually does — and that's the cover we want.
    """
    t = title or ""
    t = re.sub(
        r"\b("
        r"SOUTH\s+ASIAN(\s+ED(ITION)?)?"
        r"|SPECIAL\s+PAKISTANI(\s+ED(ITION)?)?"
        r"|PAKISTANI\s+ED(ITION)?"
        r"|INDIAN\s+(PRINT|ED(ITION)?)"
        r"|INTERNATIONAL(\s+ED(ITION)?)?"
        r"|WITH\s+ONLINE\s+ACCESS"
        r"|COMPLIMENTARY(\s+E-?BOOK)?"
        r"|WITH\s+(DVD|CD-ROM|CD)"
        r"|\d+(ST|ND|RD|TH)\s+ED(ITION)?"
        r"|REVISED"
        r"|VOL(UME)?\.?\s*\d+"
        r"|\d+\s*VOLS?\s*(SET)?"
        r"| \(\s*\d+\s*VOLS?\s*SET\s*\)"
        r")\b",
        " ",
        t,
        flags=re.I,
    )
    t = re.sub(r"[()[\]]", " ", t)
    return re.sub(r"\s{2,}", " ", t).strip(" .,-;:")


def title_search_variants(title: str) -> list[str]:
    """Ordered search strings from most specific to shortest usable core."""
    cleaned = clean_title(title)
    if not cleaned:
        return []
    variants = [cleaned]
    # Drop trailing subtitle after colon / dash for a broader match.
    core = re.split(r"\s*[:–—-]\s*", cleaned, maxsplit=1)[0].strip()
    if core and core.lower() != cleaned.lower():
        variants.append(core)
    words = cleaned.split()
    if len(words) > 6:
        variants.append(" ".join(words[:6]))
    if len(words) > 4:
        variants.append(" ".join(words[:4]))
    # Deduplicate while preserving order.
    seen: set[str] = set()
    out: list[str] = []
    for v in variants:
        key = v.lower()
        if key not in seen and len(v) >= 6:
            seen.add(key)
            out.append(v)
    return out


def validate_image(data: bytes, source_url: str = "") -> Optional[str]:
    """Return the content type for a plausible cover image, else None."""
    if len(data) <= OL_BLANK_MAX_BYTES:
        return None
    if "books.google" in source_url and len(data) <= GOOGLE_STUB_MAX_BYTES:
        return None
    if data[:3] == b"\xff\xd8\xff":
        content_type = "image/jpeg"
    elif data[:8] == b"\x89PNG\r\n\x1a\n":
        content_type = "image/png"
    elif data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        content_type = "image/webp"
    elif data[:4] == b"GIF8":
        # OL serves a 1x1 GIF for missing covers; real covers are never GIFs
        # this small.
        return None
    else:
        return None
    if len(data) < MIN_REAL_IMAGE_BYTES:
        return None
    return content_type


@dataclass
class CoverHit:
    data: bytes
    content_type: str
    source: str
    metadata: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Providers — each returns a validated CoverHit or None, never raises
# ---------------------------------------------------------------------------

async def _download(client: httpx.AsyncClient, url: str) -> Optional[bytes]:
    try:
        res = await client.get(url, follow_redirects=True)
    except httpx.HTTPError:
        return None
    if res.status_code != 200:
        return None
    return res.content


async def _download_hit(
    client: httpx.AsyncClient, url: str, source: str, metadata: dict | None = None
) -> Optional[CoverHit]:
    data = await _download(client, url)
    if data is None:
        return None
    content_type = validate_image(data, url)
    if not content_type:
        return None
    return CoverHit(data, content_type, source, metadata or {})


async def provider_openlibrary_cover_id(
    client: httpx.AsyncClient, book: dict
) -> Optional[CoverHit]:
    cover_id = book.get("ol_cover_id")
    if not cover_id:
        return None
    url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg?default=false"
    return await _download_hit(client, url, "openlibrary")


async def provider_openlibrary_isbn(
    client: httpx.AsyncClient, book: dict
) -> Optional[CoverHit]:
    isbn = book.get("_isbn")
    if not isbn:
        return None
    url = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false"
    return await _download_hit(client, url, "openlibrary")


async def provider_google_content(
    client: httpx.AsyncClient, book: dict
) -> Optional[CoverHit]:
    isbn = book.get("_isbn")
    if not isbn:
        return None
    url = (
        "https://books.google.com/books/content"
        f"?vid=ISBN{isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w800"
    )
    return await _download_hit(client, url, "google")


async def provider_google_api(
    client: httpx.AsyncClient, book: dict
) -> Optional[CoverHit]:
    url = await cover_service.fetch_cover_url(
        book.get("_isbn"), book.get("title") or "", book.get("author") or ""
    )
    if not url:
        return None
    return await _download_hit(client, url, "google")


async def provider_openlibrary_search(
    client: httpx.AsyncClient, book: dict
) -> Optional[CoverHit]:
    """Title+author search. Tries cleaned regional/edition variants so local
    reprints (e.g. SOUTH ASIAN) resolve to the international cover."""
    variants = title_search_variants(book.get("title") or "")
    if not variants:
        return None
    author = (book.get("author") or "").strip()
    author_ok = bool(author) and author.upper() not in {"N/A", "NA"}

    for title in variants:
        for use_author in ((True, False) if author_ok else (False,)):
            params: dict[str, str] = {
                "title": title,
                "limit": "5",
                "fields": (
                    "key,cover_i,cover_edition_key,subject,"
                    "first_publish_year,isbn"
                ),
            }
            if use_author:
                params["author"] = author
            try:
                res = await client.get(
                    "https://openlibrary.org/search.json",
                    params=params,
                    timeout=SEARCH_TIMEOUT,
                )
            except httpx.HTTPError:
                continue
            if res.status_code != 200:
                continue

            for doc in (res.json() or {}).get("docs") or []:
                cover_id = doc.get("cover_i")
                if not cover_id:
                    continue
                metadata: dict[str, Any] = {"ol_cover_id": int(cover_id)}
                if doc.get("key"):
                    metadata["openlibrary_id"] = doc["key"]
                if doc.get("first_publish_year"):
                    metadata["publish_year"] = int(doc["first_publish_year"])
                subjects = [
                    s for s in (doc.get("subject") or [])[:20] if isinstance(s, str)
                ]
                if subjects:
                    metadata["subjects"] = subjects
                if not book.get("_isbn"):
                    for raw in doc.get("isbn") or []:
                        isbn = clean_isbn(raw)
                        if isbn and len(isbn) == 13:
                            metadata["isbn13"] = isbn
                            break
                url = (
                    f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
                    "?default=false"
                )
                hit = await _download_hit(client, url, "openlibrary", metadata)
                if hit:
                    return hit
    return None


async def provider_internet_archive(
    client: httpx.AsyncClient, book: dict
) -> Optional[CoverHit]:
    variants = title_search_variants(book.get("title") or "")
    if not variants:
        return None
    author = (book.get("author") or "").strip()
    author_ok = bool(author) and author.upper() not in {"N/A", "NA"}

    for title in variants[:2]:
        query = f'title:("{title}") AND mediatype:texts'
        if author_ok:
            query += f' AND creator:("{author}")'
        try:
            res = await client.get(
                "https://archive.org/advancedsearch.php",
                params={
                    "q": query,
                    "fl[]": "identifier",
                    "rows": "3",
                    "output": "json",
                },
                timeout=SEARCH_TIMEOUT,
            )
        except httpx.HTTPError:
            continue
        if res.status_code != 200:
            continue
        try:
            docs = res.json()["response"]["docs"]
        except (KeyError, ValueError):
            continue

        for doc in docs:
            identifier = doc.get("identifier")
            if not identifier:
                continue
            for url in (
                f"https://archive.org/download/{identifier}/page/cover_w800.jpg",
                f"https://archive.org/services/img/{identifier}",
            ):
                hit = await _download_hit(client, url, "internet_archive")
                if hit:
                    return hit
    return None


async def provider_generated(
    client: httpx.AsyncClient, book: dict
) -> Optional[CoverHit]:
    """Last resort: branded JPEG so every catalogued title has a cover."""
    if not settings.cover_generate_fallback:
        return None
    from app.services.cover_generate import try_generate

    data = try_generate(book.get("title") or "", book.get("author"))
    if not data:
        return None
    return CoverHit(data, "image/jpeg", "generated")


# Fast exact lookups first; OL title search before Google API so we don't
# burn the (often rate-limited) API quota when Open Library already has a cover.
# Generated covers are always last.
PROVIDERS = (
    provider_openlibrary_cover_id,
    provider_openlibrary_isbn,
    provider_google_content,
    provider_openlibrary_search,
    provider_google_api,
    provider_internet_archive,
    provider_generated,
)


# ---------------------------------------------------------------------------
# Storage + persistence
# ---------------------------------------------------------------------------

def _rest_headers(json_body: bool = False) -> dict[str, str]:
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    if json_body:
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "return=minimal"
    return headers


def _base_url() -> str:
    return settings.supabase_url.rstrip("/")


def storage_public_url(book_id: str, content_type: str) -> str:
    ext = {"image/png": ".png", "image/webp": ".webp"}.get(content_type, ".jpg")
    return f"{_base_url()}/storage/v1/object/public/{BUCKET}/{book_id}{ext}"


def is_our_storage_url(url: str | None) -> bool:
    return bool(url and f"/{BUCKET}/" in url and "/storage/" in url)


async def ensure_bucket(client: httpx.AsyncClient) -> None:
    res = await client.get(f"{_base_url()}/storage/v1/bucket", headers=_rest_headers())
    res.raise_for_status()
    names = {b.get("id") or b.get("name") for b in res.json()}
    if BUCKET in names:
        return
    res = await client.post(
        f"{_base_url()}/storage/v1/bucket",
        headers={**_rest_headers(), "Content-Type": "application/json"},
        json={"id": BUCKET, "name": BUCKET, "public": True},
    )
    if res.status_code >= 400:
        raise RuntimeError(f"cannot create bucket: {res.status_code} {res.text}")
    logger.info("created public storage bucket %s", BUCKET)


async def upload_cover(
    client: httpx.AsyncClient, book_id: str, hit: CoverHit
) -> Optional[str]:
    ext = {"image/png": ".png", "image/webp": ".webp"}.get(hit.content_type, ".jpg")
    res = await client.post(
        f"{_base_url()}/storage/v1/object/{BUCKET}/{book_id}{ext}",
        headers={
            **_rest_headers(),
            "Content-Type": hit.content_type,
            "x-upsert": "true",
            "Cache-Control": "max-age=31536000",
        },
        content=hit.data,
    )
    if res.status_code >= 400:
        logger.warning("cover upload failed for %s: %s %s", book_id, res.status_code, res.text[:120])
        return None
    return storage_public_url(book_id, hit.content_type)


_metadata_columns_available: Optional[bool] = None


async def metadata_columns_available(client: httpx.AsyncClient) -> bool:
    """Whether migration 002 has been applied. Probed once per process."""
    global _metadata_columns_available
    if _metadata_columns_available is None:
        res = await client.get(
            f"{_base_url()}/rest/v1/books",
            params={"select": "cover_source", "limit": "1"},
            headers=_rest_headers(),
        )
        _metadata_columns_available = res.status_code < 400
        if not _metadata_columns_available:
            logger.warning(
                "books table has no cover metadata columns — run "
                "supabase/migrations/002_book_cover_metadata.sql to enable "
                "metadata enrichment and retry scheduling"
            )
    return _metadata_columns_available


async def _patch_book(
    client: httpx.AsyncClient, book_id: str, payload: dict[str, Any]
) -> bool:
    if not payload:
        return True
    res = await client.patch(
        f"{_base_url()}/rest/v1/books",
        params={"id": f"eq.{book_id}"},
        headers=_rest_headers(json_body=True),
        json=payload,
    )
    if res.status_code >= 400:
        logger.warning("book update failed for %s: %s %s", book_id, res.status_code, res.text[:120])
        return False
    return True


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

async def resolve_and_store(
    client: httpx.AsyncClient, book: dict[str, Any]
) -> Optional[str]:
    """Run the provider chain for one book; upload + persist on success.

    Returns the new cover URL, or None when every provider failed (the
    attempt is still recorded so the book is retried later, not endlessly).
    """
    book = dict(book)
    book["_isbn"] = clean_isbn(book.get("isbn13")) or clean_isbn(
        book.get("isbn")
    ) or isbn_from_cover_url(book.get("cover_image_url"))

    if is_our_storage_url(book.get("cover_image_url")):
        return book["cover_image_url"]  # already cached in our bucket

    hit: Optional[CoverHit] = None
    for provider in PROVIDERS:
        try:
            hit = await provider(client, book)
        except Exception:  # noqa: BLE001 — one provider must never kill the chain
            logger.exception("provider %s crashed for book %s", provider.__name__, book.get("id"))
            hit = None
        if hit:
            break

    with_metadata = await metadata_columns_available(client)
    payload: dict[str, Any] = {}
    if with_metadata:
        payload["cover_checked_at"] = datetime.now(timezone.utc).isoformat()

    if not hit:
        await _patch_book(client, book["id"], payload)
        return None

    stored_url = await upload_cover(client, book["id"], hit)
    if not stored_url:
        await _patch_book(client, book["id"], payload)
        return None

    payload["cover_image_url"] = stored_url
    if with_metadata:
        payload["cover_source"] = hit.source
        for key in ("openlibrary_id", "ol_cover_id", "publish_year", "subjects"):
            if hit.metadata.get(key) is not None:
                payload[key] = hit.metadata[key]
    if hit.metadata.get("isbn13") and not book.get("isbn13"):
        payload["isbn13"] = hit.metadata["isbn13"]

    await _patch_book(client, book["id"], payload)
    logger.info("cover stored for %s via %s", (book.get("title") or "")[:60], hit.source)
    return stored_url


_SCAN_COLUMNS = "id,title,author,isbn,isbn13,cover_image_url"
_SCAN_COLUMNS_META = _SCAN_COLUMNS + ",ol_cover_id,openlibrary_id,cover_checked_at"


async def _scan_candidates(
    client: httpx.AsyncClient, *, force: bool, limit: Optional[int]
) -> list[dict]:
    """Books whose cover needs attention: no cover, or an external (non-bucket,
    non-google) URL. Recently-checked failures are skipped unless forced."""
    with_metadata = await metadata_columns_available(client)
    params: dict[str, str] = {
        "select": _SCAN_COLUMNS_META if with_metadata else _SCAN_COLUMNS,
        "order": "id",
    }
    filters = ["cover_image_url.is.null", "cover_image_url.like.*openlibrary.org*"]
    params["or"] = f"({','.join(filters)})"
    if with_metadata and not force:
        cutoff = (
            datetime.now(timezone.utc) - timedelta(days=settings.cover_retry_days)
        ).isoformat()
        params["and"] = f"(or(cover_checked_at.is.null,cover_checked_at.lt.{cutoff}))"

    rows: list[dict] = []
    offset = 0
    page = 1000
    while True:
        res = await client.get(
            f"{_base_url()}/rest/v1/books",
            params={**params, "limit": str(page), "offset": str(offset)},
            headers=_rest_headers(),
        )
        res.raise_for_status()
        batch = res.json()
        rows.extend(batch)
        if len(batch) < page or (limit is not None and len(rows) >= limit):
            break
        offset += len(batch)
    return rows[:limit] if limit is not None else rows


async def sync_missing_covers(
    *,
    limit: Optional[int] = None,
    concurrency: int = 6,
    force: bool = False,
) -> dict[str, int]:
    """Scan for books needing covers and run the pipeline on each."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase is not configured")

    stats = {"scanned": 0, "stored": 0, "failed": 0}
    sem = asyncio.Semaphore(max(1, concurrency))

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        await ensure_bucket(client)
        candidates = await _scan_candidates(client, force=force, limit=limit)
        logger.info("cover sync: %d candidate book(s)", len(candidates))

        async def worker(row: dict) -> None:
            async with sem:
                url = await resolve_and_store(client, row)
                stats["scanned"] += 1
                stats["stored" if url else "failed"] += 1

        await asyncio.gather(*[worker(row) for row in candidates])

    logger.info("cover sync finished: %s", stats)
    return stats


async def run_sync_forever(stop_event: asyncio.Event | None = None) -> None:
    """Background loop for the FastAPI app: initial delay, then periodic sync."""
    stop = stop_event or asyncio.Event()
    interval = max(0.25, settings.cover_sync_interval_hours) * 3600
    try:
        await asyncio.wait_for(stop.wait(), timeout=60)  # let the app boot first
        return  # stop was set during boot
    except asyncio.TimeoutError:
        pass
    while not stop.is_set():
        try:
            await sync_missing_covers()
        except Exception:  # noqa: BLE001 — the loop must survive any failure
            logger.exception("cover sync pass failed")
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except asyncio.TimeoutError:
            continue
