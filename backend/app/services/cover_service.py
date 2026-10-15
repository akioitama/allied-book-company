"""Google Books API lookups for cover URLs (URL resolution only — no uploads).

This is one provider inside the cover pipeline
(app/services/cover_pipeline.py); prefer calling the pipeline rather than
this module directly unless you specifically want a Google-hosted URL.

Known limitations:
- Unauthenticated requests can be throttled under heavy bulk import —
  use caching + inter-request delays when syncing hundreds of titles.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"
REQUEST_TIMEOUT = 8.0

# Global throttle: concurrent sync passes were burning the unauthenticated
# quota (HTTP 429) before title search could succeed.
_google_lock = asyncio.Lock()
_google_cooldown_until = 0.0
_GOOGLE_MIN_INTERVAL = 0.75
_GOOGLE_COOLDOWN_SECONDS = 60.0
_last_google_call = 0.0

# Prefer the largest rendition Google offers; small thumbnails are blurry
# when scaled to card/detail size.
IMAGE_KEYS = (
    "extraLarge",
    "large",
    "medium",
    "small",
    "thumbnail",
    "smallThumbnail",
)

# In-memory cache: key -> (url_or_None, expires_at)
_CACHE: dict[str, tuple[Optional[str], float]] = {}
_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days
_CACHE_NEGATIVE_TTL = 60 * 60  # 1 hour for "no cover found"


def _cache_key(isbn: str | None, title: str, author: str) -> str:
    if isbn:
        return f"isbn:{isbn.strip()}"
    return f"ta:{title.strip().lower()}|{author.strip().lower()}"


def _get_cached(key: str) -> tuple[bool, Optional[str]]:
    """Return (hit, url). url may be None on a cached miss."""
    entry = _CACHE.get(key)
    if not entry:
        return False, None
    url, expires = entry
    if time.time() > expires:
        _CACHE.pop(key, None)
        return False, None
    return True, url


def _set_cached(key: str, url: Optional[str]) -> None:
    ttl = _CACHE_TTL_SECONDS if url else _CACHE_NEGATIVE_TTL
    _CACHE[key] = (url, time.time() + ttl)

    redis_url = settings.redis_url
    if not redis_url:
        return
    try:
        import redis  # type: ignore

        client = redis.from_url(redis_url, decode_responses=True)
        # Store empty string for negative cache
        client.setex(f"cover:{key}", ttl, url or "")
    except Exception as exc:  # noqa: BLE001 — cache must never break sync
        logger.debug("Redis cover cache write skipped: %s", exc)


def _get_cached_redis(key: str) -> tuple[bool, Optional[str]]:
    if not settings.redis_url:
        return False, None
    try:
        import redis  # type: ignore

        client = redis.from_url(settings.redis_url, decode_responses=True)
        value = client.get(f"cover:{key}")
        if value is None:
            return False, None
        return True, value or None
    except Exception as exc:  # noqa: BLE001
        logger.debug("Redis cover cache read skipped: %s", exc)
        return False, None


def _to_https(url: str) -> str:
    if url.startswith("http://"):
        return "https://" + url[len("http://") :]
    return url


def _upgrade_resolution(url: str) -> str:
    """Ask Google's image CDN for a large rendition instead of the default."""
    if "fife=" in url:
        return url
    if "books.google" in url or "googleusercontent.com" in url:
        return url + ("&" if "?" in url else "?") + "fife=w800"
    return url


def _pick_image_url(image_links: dict[str, Any] | None) -> Optional[str]:
    if not image_links:
        return None
    for key in IMAGE_KEYS:
        raw = image_links.get(key)
        if isinstance(raw, str) and raw.strip():
            return _upgrade_resolution(_to_https(raw.strip()))
    return None


def _extract_cover(payload: dict[str, Any]) -> Optional[str]:
    items = payload.get("items") or []
    if not items:
        return None
    volume = (items[0] or {}).get("volumeInfo") or {}
    return _pick_image_url(volume.get("imageLinks"))


async def _get_json(client: httpx.AsyncClient, params: dict[str, str]) -> Optional[dict]:
    global _google_cooldown_until, _last_google_call
    if settings.google_books_api_key:
        params = {**params, "key": settings.google_books_api_key}

    async with _google_lock:
        now = time.time()
        if now < _google_cooldown_until:
            return None
        wait = _GOOGLE_MIN_INTERVAL - (now - _last_google_call)
        if wait > 0:
            await asyncio.sleep(wait)
        try:
            res = await client.get(GOOGLE_BOOKS_URL, params=params)
            _last_google_call = time.time()
            if res.status_code == 429:
                _google_cooldown_until = time.time() + _GOOGLE_COOLDOWN_SECONDS
                logger.warning(
                    "Google Books rate-limited; cooling down %ss",
                    int(_GOOGLE_COOLDOWN_SECONDS),
                )
                return None
            if res.status_code != 200:
                logger.warning(
                    "Google Books non-200 (%s) for q=%s",
                    res.status_code,
                    params.get("q"),
                )
                return None
            return res.json()
        except (httpx.TimeoutException, httpx.HTTPError) as exc:
            logger.warning("Google Books request failed: %s", exc)
            return None


def _clean_search_title(title: str) -> str:
    """Light strip of regional edition noise for Google intitle queries."""
    t = re.sub(
        r"\b(SOUTH\s+ASIAN|INTERNATIONAL|PAKISTANI|INDIAN\s+PRINT|"
        r"WITH\s+ONLINE\s+ACCESS|\d+(ST|ND|RD|TH)\s+ED(ITION)?)\b",
        " ",
        title or "",
        flags=re.I,
    )
    return re.sub(r"\s{2,}", " ", t).strip(" .,-")


async def fetch_cover_url(
    isbn: str | None,
    title: str,
    author: str,
) -> str | None:
    """Resolve a Google-hosted cover URL for a book, or None if unavailable."""
    key = _cache_key(isbn, title, author)

    hit, cached = _get_cached(key)
    if hit:
        return cached

    hit, cached = _get_cached_redis(key)
    if hit:
        _set_cached(key, cached)  # warm local
        return cached

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        cover: Optional[str] = None
        saw_success = False

        if isbn and isbn.strip():
            payload = await _get_json(client, {"q": f"isbn:{isbn.strip()}"})
            if payload is not None:
                saw_success = True
                cover = _extract_cover(payload)

        clean_title = _clean_search_title(title)
        if not cover and clean_title:
            q = f"intitle:{clean_title}"
            if author.strip() and author.strip().upper() not in {"N/A", "NA"}:
                q += f"+inauthor:{author.strip()}"
            payload = await _get_json(client, {"q": q})
            if payload is not None:
                saw_success = True
                cover = _extract_cover(payload)

    # Only cache confirmed lookups — never cache transport/429 failures as misses
    if saw_success:
        _set_cached(key, cover)
    return cover


async def fetch_covers_with_delay(
    books: list[dict[str, Any]],
    *,
    delay_seconds: float = 0.35,
) -> list[Optional[str]]:
    """Bulk helper — spaces requests to avoid hammering Google Books."""
    results: list[Optional[str]] = []
    for i, book in enumerate(books):
        url = await fetch_cover_url(
            book.get("isbn"),
            book.get("title") or "",
            book.get("author") or "",
        )
        results.append(url)
        if i < len(books) - 1 and delay_seconds > 0:
            await asyncio.sleep(delay_seconds)
    return results
