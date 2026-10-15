-- Allied Book Company — Supabase schema
-- Run in Supabase SQL editor. Create Storage bucket `book-covers` (public read).

create extension if not exists "pgcrypto";

-- Categories must exist before books FK
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  coordinate_label text,
  description text
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  author text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  cover_image_url text,
  isbn text,
  category_id uuid references categories(id),
  stock integer default 0,
  is_featured boolean default false,
  waypoint_order integer,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  status text default 'pending',
  total_cents integer not null,
  shipping_address jsonb,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  book_id uuid references books(id),
  quantity integer not null check (quantity > 0),
  price_cents integer not null
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique,
  tier text default 'standard',
  joined_at timestamptz default now()
);

-- Public read for catalog
alter table books enable row level security;
alter table categories enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table memberships enable row level security;

create policy "Public read books"
  on books for select
  using (true);

create policy "Public read categories"
  on categories for select
  using (true);

create policy "Users read own orders"
  on orders for select
  using (auth.uid() = user_id);

create policy "Users insert own orders"
  on orders for insert
  with check (auth.uid() = user_id);

create policy "Users read own order items"
  on order_items for select
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

create policy "Users insert own order items"
  on order_items for insert
  with check (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

create policy "Users read own membership"
  on memberships for select
  using (auth.uid() = user_id);

create policy "Users upsert own membership"
  on memberships for insert
  with check (auth.uid() = user_id);

create policy "Users update own membership"
  on memberships for update
  using (auth.uid() = user_id);

-- Service role (FastAPI) bypasses RLS for admin writes / webhooks.
-- Grant authenticated users no direct write on books/categories.
