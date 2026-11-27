-- A book may sit on a parent subject shelf, which has no sub-subject.
--
-- migrations/005_subject_taxonomy.sql made `sub_subject` NOT NULL, but a parent
-- shelf (e.g. Engineering, Medicine & Healthcare) legitimately has no child —
-- `subjects.ts` models it as `childName: string | null`. Books re-homed from the
-- legacy shelves land on those parent shelves, so the column must allow NULL.
--
-- `subject` stays NOT NULL and keeps its taxonomy CHECK: every book still has a
-- real parent subject. `sub_subject`, when present, must still be a taxonomy name.

alter table books alter column sub_subject drop not null;

alter table books drop constraint if exists books_sub_subject_taxonomy_check;
alter table books add constraint books_sub_subject_taxonomy_check check (
  sub_subject is null
  or sub_subject = any (public.allied_sub_subject_names())
);

-- Every book must still have a parent subject.
update books set subject = 'Books for School' where subject is null;
alter table books alter column subject set not null;
