from typing import Optional

from pydantic import BaseModel, Field


class BookOut(BaseModel):
    id: str
    slug: str
    title: str
    author: str
    description: Optional[str] = None
    price_cents: int
    cover_image_url: Optional[str] = None
    category_id: Optional[str] = None
    stock: int = 0
    is_featured: bool = False
    waypoint_order: Optional[int] = None
    isbn: Optional[str] = None


class BookCreateIn(BaseModel):
    title: str
    author: str
    description: Optional[str] = None
    price_cents: int = Field(ge=0)
    category_id: Optional[str] = None
    stock: int = 0
    is_featured: bool = False
    waypoint_order: Optional[int] = None
    isbn: Optional[str] = None
    slug: Optional[str] = None
    # If omitted, Google Books cover is fetched automatically
    cover_image_url: Optional[str] = None


class CoverRefreshOut(BaseModel):
    id: str
    cover_image_url: Optional[str] = None
    found: bool


class CategoryOut(BaseModel):
    id: str
    slug: str
    name: str
    coordinate_label: Optional[str] = None
    description: Optional[str] = None


class CartLineIn(BaseModel):
    book_id: str
    quantity: int = Field(ge=1, le=20)


class ShippingAddress(BaseModel):
    name: str
    line1: str
    city: str
    region: str
    postal: str
    country: str
    email: Optional[str] = None


class CheckoutSessionIn(BaseModel):
    items: list[CartLineIn]
    shipping_address: ShippingAddress
    success_url: str
    cancel_url: str


class CheckoutSessionOut(BaseModel):
    url: Optional[str] = None
    demo_order_id: Optional[str] = None


class MembershipJoinIn(BaseModel):
    tier: str = "standard"


class OrderOut(BaseModel):
    id: str
    status: str
    total_cents: int
    shipping_address: Optional[dict] = None
    created_at: Optional[str] = None
    items: list[dict] = []
