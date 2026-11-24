from __future__ import annotations

import uuid
from typing import Any

from app.core.supabase_client import get_supabase
from app.services.catalog_data import DEMO_BOOKS


def resolve_line_items(items: list[dict]) -> tuple[list[dict], int]:
    """Return priced lines and total cents from cart input."""
    book_map = {b["id"]: b for b in DEMO_BOOKS}
    supabase = get_supabase()
    lines: list[dict] = []
    total = 0

    for item in items:
        book_id = item["book_id"]
        qty = item["quantity"]
        book = None

        if supabase:
            res = supabase.table("books").select("*").eq("id", book_id).limit(1).execute()
            if res.data:
                book = res.data[0]
        if not book:
            book = book_map.get(book_id)
        if not book:
            continue

        price = int(book["price_cents"])
        lines.append(
            {
                "book_id": book["id"],
                "title": book["title"],
                "quantity": qty,
                "price_cents": price,
            }
        )
        total += price * qty

    return lines, total


def create_order(
    *,
    user_id: str | None,
    lines: list[dict],
    total_cents: int,
    shipping_address: dict[str, Any],
    status: str = "paid",
) -> dict:
    order_id = str(uuid.uuid4())
    supabase = get_supabase()

    if not supabase:
        return {
            "id": order_id if user_id != "demo-user" else "demo-voyage",
            "status": status,
            "total_cents": total_cents,
            "shipping_address": shipping_address,
            "items": lines,
            "demo": True,
        }

    order_row = {
        "id": order_id,
        "user_id": user_id,
        "status": status,
        "total_cents": total_cents,
        "shipping_address": shipping_address,
    }
    supabase.table("orders").insert(order_row).execute()

    for line in lines:
        supabase.table("order_items").insert(
            {
                "order_id": order_id,
                "book_id": line["book_id"],
                "quantity": line["quantity"],
                "price_cents": line["price_cents"],
            }
        ).execute()
        # Atomic stock decrement (avoids the read-then-write race where two
        # simultaneous orders overwrite each other).
        supabase.rpc(
            "decrement_book_stock",
            {"p_book_id": line["book_id"], "p_quantity": int(line["quantity"])},
        ).execute()

    return {**order_row, "items": lines}
