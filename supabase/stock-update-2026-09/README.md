# Stock update — WEB SITE STOCK.xls

## Important fix
Staging is now a **real** table `public.stock_staging` (not TEMP).
Supabase SQL Editor often uses a new connection per Run, which made TEMP tables disappear.

## Run order (`parts/`)

1. `00_setup.sql`
2. `02_insert_part_01.sql` … `02_insert_part_09.sql`
3. `99_apply_updates.sql` (updates books, then drops staging)

You can use different tabs/runs now — the staging table persists until step 3.

## If you already hit “relation stock_staging does not exist”
Start over from `00_setup.sql`, then all insert parts, then `99_apply_updates.sql`.
