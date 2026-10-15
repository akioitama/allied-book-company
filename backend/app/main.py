import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import admin, books, categories, checkout, memberships, orders, webhooks
from app.services.cover_pipeline import run_sync_forever


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Background cover sync: picks up newly added books and retries failures
    # without any manual intervention.
    stop = asyncio.Event()
    task: asyncio.Task | None = None
    if (
        settings.cover_sync_enabled
        and settings.supabase_url
        and settings.supabase_service_role_key
    ):
        task = asyncio.create_task(run_sync_forever(stop))
    yield
    stop.set()
    if task:
        task.cancel()


app = FastAPI(
    title="Allied Book Company API",
    description="Business logic, Stripe checkout, and protected order routes.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(books.router, prefix="/books", tags=["books"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])
app.include_router(checkout.router, prefix="/cart", tags=["cart"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(memberships.router, prefix="/memberships", tags=["memberships"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "allied-book-company"}
