# Allied Book Co.

Online bookstore with an **Old Map & Atlas House** identity — browsing feels like charting an expedition, not shopping a generic catalog.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python) |
| Data / Auth | Supabase (Postgres + Auth + Storage) |
| Payments | Stripe Checkout + webhooks |

## Project layout

```
frontend/          Next.js app
backend/           FastAPI API
supabase/          schema.sql + seed.sql
```

## Quick start (demo mode)

Works without Supabase or Stripe — catalog and cart use local data; checkout creates a demo voyage log entry.

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs).

## Design system

- **Colors:** parchment, ink, forest, oxblood, brass (Tailwind tokens)
- **Fonts:** Playfair Display · EB Garamond · Jost
- **Compass companion:** fixed wayfinding widget — label + needle update by route and homepage section
- **Motifs:** waypoint routes, territory coordinates, wax seals, map-grid parchment

Unique interactive pieces:

- Live **atlas board** (hover territories for bearings)
- Cursor **ink-trail** blooms on parchment (`prefers-reduced-motion` respected)
- Header **search bar** with live title/author suggestions
- Compass companion across routes
- Checkout steps as log entries: Departure Details → Cargo Review → Set Sail

## Supabase setup

1. Create a project and run `supabase/schema.sql`, then `supabase/seed.sql`.
2. Create a public Storage bucket named `book-covers`.
3. Copy URL + anon key into `frontend/.env.local`.
4. Copy URL + service role key + JWT secret into `backend/.env`.
5. Set `DEMO_MODE=false` when ready for real auth-gated writes.

## Stripe setup

1. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `backend/.env`.
2. Point webhook to `POST /webhooks/stripe` (checkout.session.completed).
3. Checkout will redirect to Stripe-hosted payment instead of the demo order path.

## Order emails

Placing an order calls `POST /api/orders` (`frontend/src/app/api/orders/route.ts`), which
emails the order to the store inbox. Configure **one** authenticated sender in
`frontend/.env.local` (and in the Vercel project's environment variables):

| Variable | Purpose |
|---|---|
| `GMAIL_USER` | Gmail address used to send (e.g. `info@alliedbook.com`) |
| `GMAIL_APP_PASSWORD` | Google **App Password** for that account (2-Step Verification required) |
| `RESEND_API_KEY` | Alternative to Gmail — [Resend](https://resend.com) API key |
| `ORDER_FROM_EMAIL` | Resend sender, e.g. `Allied Book Co. <orders@alliedbook.com>` (domain must be verified) |
| `ORDER_NOTIFY_EMAIL` | Where orders go (default `info@alliedbook.com`; comma-separate for several inboxes) |

Sending order: Gmail SMTP → Resend → free FormSubmit relay (last resort; needs a one-time
activation and may be blocked — if it is used, the success page asks the customer to also
message WhatsApp).

Diagnose a deployment (no dashboard access needed):

- `GET  /api/orders` — shows which sender is configured
- `POST /api/orders` with body `{"test": true}` — sends a test email to `ORDER_NOTIFY_EMAIL`

If no sender is configured, checkout shows an error instead of a false "order confirmed",
so orders are never silently lost.


| Route | Purpose |
|---|---|
| `/` | Homepage — hero, heritage |
| `/shop` | Catalog + search/filters |
| `/shop/[slug]` | Book detail |
| `/cart` | Manifest |
| `/checkout` | Shipping → review → pay |
| `/account` | Voyage log |
| `/account/orders/[id]` | Order detail |
| `/login`, `/signup` | Supabase Auth |
| `/about` | Heritage |

## Book covers

`books.cover_image_url` stores a validated HTTPS cover URL (no image upload). All
display-side resolution lives in `frontend/src/lib/books/covers.ts`, which builds an
ordered fallback chain per book:

1. **Stored URL** — upgraded at render time (Google URLs get `fife=w800` for the
   largest real image; Open Library URLs get `default=false` so missing covers 404
   instead of returning a blank 1×1 gif).
2. **Google Books by ISBN** — high-res content endpoint (`zoom=1&fife=w800`).
   Never use `zoom=2/3`: they return generic placeholder scans, not covers.
3. **Open Library by ISBN** — `-L` (largest) size.

`<BookCover>` walks the chain on load error or when it detects a "missing cover"
stub image (OL 1×1 gif, Google 128×170 near-white stub), and renders a styled
placeholder only when every source fails. Covers are optimized and cached
long-term by the Next.js image pipeline (`minimumCacheTTL` 31 days).

Maintenance scripts (run from repo root, need `backend/.env`):

- `python scripts/refresh_covers_google.py --all` — replace blank Open Library
  ISBN covers with validated Google Books images.
- `python scripts/recover_missing_covers.py --apply` — find covers for books whose
  stored URL is dead, via Open Library title/author search.

Backend admin endpoints:

- **Create book:** `POST /admin/books` (header `X-Admin-Key`) — fetches cover before insert
- **Refresh one cover:** `POST /admin/books/{id}/refresh-cover`
- **Bulk import:** `python -m scripts.import_books scripts/sample_isbns.json --delay 0.35`

Optional env: `GOOGLE_BOOKS_API_KEY`, `ADMIN_API_KEY`, `REDIS_URL` (shared cover cache).

Run `supabase/migrations/001_books_isbn.sql` to add the `isbn` column on existing DBs.

## Deploy

- **Frontend:** Vercel (`frontend/`)
- **Backend:** Railway / Render / Fly.io (`backend/`, start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`)
- **Supabase:** hosted project
