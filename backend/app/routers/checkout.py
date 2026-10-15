from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.schemas.models import CheckoutSessionIn, CheckoutSessionOut
from app.services import order_service, stripe_service

router = APIRouter()


@router.post("/checkout-session", response_model=CheckoutSessionOut)
def create_checkout_session(
    body: CheckoutSessionIn,
    user: dict = Depends(get_current_user),
):
    lines, total = order_service.resolve_line_items(
        [i.model_dump() for i in body.items]
    )
    if not lines:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail="No valid cart items")

    stripe_lines = [
        {
            "price_data": {
                "currency": "usd",
                "unit_amount": line["price_cents"],
                "product_data": {"name": line["title"]},
            },
            "quantity": line["quantity"],
        }
        for line in lines
    ]

    url = stripe_service.create_checkout_session(
        line_items=stripe_lines,
        success_url=body.success_url,
        cancel_url=body.cancel_url,
        metadata={
            "user_id": str(user.get("sub", "")),
            "total_cents": str(total),
        },
    )

    if url:
        return CheckoutSessionOut(url=url)

    # Demo fallback — create order immediately
    order = order_service.create_order(
        user_id=str(user.get("sub")),
        lines=lines,
        total_cents=total,
        shipping_address=body.shipping_address.model_dump(),
        status="paid",
    )
    return CheckoutSessionOut(demo_order_id=order["id"])
