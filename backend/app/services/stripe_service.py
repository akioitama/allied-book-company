from typing import Optional

import stripe

from app.core.config import settings


def configure_stripe() -> bool:
    if not settings.stripe_secret_key:
        return False
    stripe.api_key = settings.stripe_secret_key
    return True


def create_checkout_session(
    *,
    line_items: list[dict],
    success_url: str,
    cancel_url: str,
    metadata: Optional[dict] = None,
) -> Optional[str]:
    if not configure_stripe():
        return None

    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=line_items,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata or {},
    )
    return session.url


def construct_event(payload: bytes, sig_header: str):
    if not settings.stripe_webhook_secret:
        raise ValueError("Stripe webhook secret not configured")
    return stripe.Webhook.construct_event(
        payload, sig_header, settings.stripe_webhook_secret
    )
