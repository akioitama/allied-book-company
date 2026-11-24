-- Decrement stock for an order, atomically, without exposing table writes.
--
-- Why this exists: the storefront runs with the PUBLIC anon key, and RLS on
-- `books` has only a SELECT policy ("Grant authenticated users no direct write
-- on books/categories"). A plain UPDATE from the website is therefore silently
-- blocked — that is why stock never changed after an order.
--
-- This function is SECURITY DEFINER, so it may change stock while the caller
-- still has no direct write access. It:
--   * validates the quantity (1..1000) so a bad request cannot corrupt stock;
--   * never lets stock go below 0.

create or replace function public.decrement_book_stock(
  p_book_id uuid,
  p_quantity integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_stock integer;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 1000 then
    raise exception 'Invalid quantity for stock update: %', p_quantity
      using errcode = '22023';
  end if;

  update books
     set stock = greatest(0, coalesce(stock, 0) - p_quantity)
   where id = p_book_id
  returning stock into v_new_stock;

  if v_new_stock is null then
    raise exception 'Book % not found', p_book_id
      using errcode = 'P0002';
  end if;

  return v_new_stock;
end;
$$;

comment on function public.decrement_book_stock(uuid, integer) is
  'Atomically reduce books.stock. Safe for anon callers: validates quantity and never goes below zero.';

-- Callers still cannot UPDATE the table; this only exposes the one operation.
revoke all on function public.decrement_book_stock(uuid, integer) from public;
grant execute on function public.decrement_book_stock(uuid, integer)
  to anon, authenticated, service_role;
