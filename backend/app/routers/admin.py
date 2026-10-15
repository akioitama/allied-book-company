from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.config import settings
from app.core.supabase_client import get_supabase
from app.schemas.models import BookCreateIn, BookOut, CoverRefreshOut
from app.services import cover_service
from app.services.catalog_data import DEMO_BOOKS

router = APIRouter()


def require_admin(
    x_admin_key: Annotated[Optional[str], Header(alias="X-Admin-Key")] = None,
) -> None:
    """Simple shared-secret gate for admin book ops.

    In demo_mode with no ADMIN_API_KEY set, allow local development.
    """
    expected = settings.admin_api_key
    if not expected:
        if settings.demo_mode:
            return
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ADMIN_API_KEY is not configured",
        )
    if x_admin_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin key",
        )


def _slugify(title: str) -> str:
    raw = "".join(ch.lower() if ch.isalnum() else "-" for ch in title.strip())
    while "--" in raw:
        raw = raw.replace("--", "-")
    return raw.strip("-") or "book"


@router.post("/books", response_model=BookOut, status_code=201)
async def create_book(
    body: BookCreateIn,
    _: None = Depends(require_admin),
):
    """Create a book and fetch cover_image_url from Google Books before insert."""
    cover = body.cover_image_url
    if not cover:
        cover = await cover_service.fetch_cover_url(body.isbn, body.title, body.author)

    slug = body.slug or _slugify(body.title)
    row = {
        "slug": slug,
        "title": body.title,
        "author": body.author,
        "description": body.description,
        "price_cents": body.price_cents,
        "cover_image_url": cover,
        "category_id": body.category_id,
        "stock": body.stock,
        "is_featured": body.is_featured,
        "waypoint_order": body.waypoint_order,
        "isbn": body.isbn,
    }

    supabase = get_supabase()
    if not supabase:
        # Demo: return a synthetic row (not persisted)
        demo = {
            "id": f"demo-{slug}",
            **row,
        }
        DEMO_BOOKS.append(
            {
                "id": demo["id"],
                "slug": slug,
                "title": body.title,
                "author": body.author,
                "description": body.description or "",
                "price_cents": body.price_cents,
                "cover_image_url": cover,
                "category_id": body.category_id or "cat-1",
                "stock": body.stock,
                "is_featured": body.is_featured,
                "waypoint_order": body.waypoint_order,
                "isbn": body.isbn,
            }
        )
        return demo

    # Prefer omitting null isbn if column missing on older DBs — still send when set
    insert_payload = {k: v for k, v in row.items() if v is not None or k == "cover_image_url"}
    res = supabase.table("books").insert(insert_payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to insert book")
    return res.data[0]


@router.post("/books/{book_id}/refresh-cover", response_model=CoverRefreshOut)
async def refresh_cover(
    book_id: str,
    _: None = Depends(require_admin),
):
    """Run the full cover pipeline (all providers + permanent storage) for one book."""
    supabase = get_supabase()

    book: dict | None = None
    if supabase:
        res = supabase.table("books").select("*").eq("id", book_id).limit(1).execute()
        book = res.data[0] if res.data else None
    else:
        book = next((b for b in DEMO_BOOKS if b["id"] == book_id), None)

    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if supabase:
        import httpx

        from app.services.cover_pipeline import (
            REQUEST_TIMEOUT,
            ensure_bucket,
            resolve_and_store,
        )

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            await ensure_bucket(client)
            # Clear the stored URL so the pipeline re-resolves from scratch.
            cover = await resolve_and_store(client, {**book, "cover_image_url": None})
    else:
        cover = await cover_service.fetch_cover_url(
            book.get("isbn"),
            book.get("title") or "",
            book.get("author") or "",
        )
        book["cover_image_url"] = cover

    return CoverRefreshOut(
        id=book_id,
        cover_image_url=cover,
        found=cover is not None,
    )
