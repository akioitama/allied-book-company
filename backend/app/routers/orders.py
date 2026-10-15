from fastapi import APIRouter, Depends, HTTPException

from app.core.supabase_client import get_supabase
from app.dependencies import get_current_user
from app.schemas.models import OrderOut

router = APIRouter()


@router.get("", response_model=list[OrderOut])
def list_orders(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user.get("sub")
    if not supabase:
        return [
            {
                "id": "demo-voyage",
                "status": "paid",
                "total_cents": 8297,
                "shipping_address": None,
                "created_at": "2026-07-20T12:00:00Z",
                "items": [],
            }
        ]

    res = (
        supabase.table("orders")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    if not supabase:
        if order_id in {"demo-voyage"}:
            return {
                "id": "demo-voyage",
                "status": "paid",
                "total_cents": 8297,
                "shipping_address": {"name": "Demo Reader"},
                "created_at": "2026-07-20T12:00:00Z",
                "items": [],
            }
        raise HTTPException(status_code=404, detail="Order not found")

    res = (
        supabase.table("orders")
        .select("*")
        .eq("id", order_id)
        .eq("user_id", user.get("sub"))
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")

    items = (
        supabase.table("order_items")
        .select("*")
        .eq("order_id", order_id)
        .execute()
        .data
        or []
    )
    order = res.data[0]
    order["items"] = items
    return order
