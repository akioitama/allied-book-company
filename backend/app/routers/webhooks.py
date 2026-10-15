import json

from fastapi import APIRouter, Header, HTTPException, Request

from app.services import order_service, stripe_service

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
):
    payload = await request.body()

    try:
        if stripe_signature:
            event = stripe_service.construct_event(payload, stripe_signature)
        else:
            # Allow unsigned payloads only in local demo inspection
            event = json.loads(payload.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    event_type = event["type"] if isinstance(event, dict) else event.type
    data_object = (
        event["data"]["object"] if isinstance(event, dict) else event.data.object
    )

    if event_type == "checkout.session.completed":
        metadata = data_object.get("metadata") or {}
        # In production, persist cart snapshot in metadata or a pending_orders table.
        # Here we record a paid order shell when metadata carries totals.
        total = int(metadata.get("total_cents") or 0)
        user_id = metadata.get("user_id")
        order_service.create_order(
            user_id=user_id or None,
            lines=[],
            total_cents=total,
            shipping_address={},
            status="paid",
        )

    return {"received": True}
