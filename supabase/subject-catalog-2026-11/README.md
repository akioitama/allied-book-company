# Subject catalog — 2026-11

Generated from `WEBSITE LIST 04-11-2026-Sheet1.csv` on 2026-11-27T11:21:48.955Z.

- Books with CODE: **6880**
- Books matched by ISBN only: **15**
- Shelves in use: **97** of 101

## Run order
1. `supabase/migrations/005_subject_taxonomy.sql` — columns + taxonomy constraints
2. `parts/00_setup.sql` — (re)creates the staging table
3. `parts/01_categories.sql` — inserts the 108 shelves into `categories`
4. `parts/02_insert_part_01.sql` … all 35 parts — fills staging
5. `parts/99_apply.sql` — sets `category_id`, `subject`, `sub_subject`

Every file is safe to re-run. Stock quantities and prices are **not** modified.
