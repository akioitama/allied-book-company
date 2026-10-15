from typing import Optional

from fastapi import APIRouter, Query

from app.core.supabase_client import get_supabase
from app.schemas.models import BookOut
from app.services.catalog_data import DEMO_BOOKS

router = APIRouter()


@router.get("", response_model=list[BookOut])
def list_books(
    category: Optional[str] = None,
    q: Optional[str] = None,
    min_price: Optional[int] = Query(None, alias="min"),
    max_price: Optional[int] = Query(None, alias="max"),
    author: Optional[str] = None,
):
    supabase = get_supabase()
    if supabase:
        query = supabase.table("books").select("*")
        if category:
            cats = (
                supabase.table("categories")
                .select("id")
                .eq("slug", category)
                .limit(1)
                .execute()
            )
            if cats.data:
                query = query.eq("category_id", cats.data[0]["id"])
        if author:
            query = query.ilike("author", f"%{author}%")
        if min_price is not None:
            query = query.gte("price_cents", min_price)
        if max_price is not None:
            query = query.lte("price_cents", max_price)
        rows = query.execute().data or []
        if q:
            ql = q.lower()
            rows = [
                r
                for r in rows
                if ql in (r.get("title") or "").lower()
                or ql in (r.get("author") or "").lower()
                or ql in (r.get("description") or "").lower()
            ]
        return rows

    rows = list(DEMO_BOOKS)
    if category:
        from app.services.catalog_data import DEMO_CATEGORIES

        cat = next((c for c in DEMO_CATEGORIES if c["slug"] == category), None)
        if cat:
            rows = [r for r in rows if r["category_id"] == cat["id"]]
    if author:
        al = author.lower()
        rows = [r for r in rows if al in r["author"].lower()]
    if min_price is not None:
        rows = [r for r in rows if r["price_cents"] >= min_price]
    if max_price is not None:
        rows = [r for r in rows if r["price_cents"] <= max_price]
    if q:
        ql = q.lower()
        rows = [
            r
            for r in rows
            if ql in r["title"].lower()
            or ql in r["author"].lower()
            or ql in (r.get("description") or "").lower()
        ]
    return rows


@router.get("/{slug}", response_model=BookOut)
def get_book(slug: str):
    supabase = get_supabase()
    if supabase:
        res = supabase.table("books").select("*").eq("slug", slug).limit(1).execute()
        if res.data:
            return res.data[0]
    book = next((b for b in DEMO_BOOKS if b["slug"] == slug), None)
    if not book:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Book not found")
    return book
