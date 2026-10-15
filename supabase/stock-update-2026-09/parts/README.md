# Stock update — split parts (SQL Editor safe)

The full `01_apply_stock_update.sql` is too large for Supabase SQL Editor.
Use these parts instead.

## Critical
Run **all parts in the same SQL Editor tab/session**.
`stock_staging` is a **TEMP** table — closing the tab clears it.

## Order
1. `00_setup.sql` — ALTERs + CREATE TEMP TABLE
2. `02_insert_part_01.sql` … `02_insert_part_09.sql` — load staging rows
3. `99_apply_updates.sql` — UPDATE books + verification SELECT

## Checklist
1. [ ] 00_setup.sql
2. [ ] 02_insert_part_01.sql
3. [ ] 02_insert_part_02.sql
4. [ ] 02_insert_part_03.sql
5. [ ] 02_insert_part_04.sql
6. [ ] 02_insert_part_05.sql
7. [ ] 02_insert_part_06.sql
8. [ ] 02_insert_part_07.sql
9. [ ] 02_insert_part_08.sql
10. [ ] 02_insert_part_09.sql
11. [ ] 99_apply_updates.sql

## If an INSERT part fails
Re-run that part only (same session). Then continue with the next part.
Do **not** re-run `00_setup.sql` mid-way unless you want to wipe staging (`TRUNCATE` is in setup).
