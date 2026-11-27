-- Hide legacy shelves with a flag instead of mangling their name.
--
-- 01_categories.sql used to append ' (retired)' to every category outside the
-- subject taxonomy. That name is user-facing: `categories.name` is what the
-- storefront prints on a book card, so any book still pointing at one of those
-- rows displayed "Pakistan Studies (retired)".
--
-- This migration only repairs the damage already done:
--   1. adds `categories.is_active`,
--   2. restores the real names.
--
-- Which rows are active is decided by `01_categories.sql`, which now sets the
-- flag from the taxonomy instead of renaming. Running this migration before
-- re-running 01_categories.sql restores the names; running 01_categories.sql
-- re-running afterwards sets the flags.

alter table categories
  add column if not exists is_active boolean not null default true;

comment on column categories.is_active is
  'False for legacy shelves that are not part of the subject taxonomy (see subjects.ts)';

-- Undo the name mangling.
update categories
   set name = regexp_replace(name, '\s*\(retired\)\s*$', '')
 where name like '% (retired)';

create index if not exists categories_is_active_idx
  on categories (is_active)
  where is_active;
