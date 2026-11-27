-- Books may only sit on a subject shelf that exists in the site taxonomy.
--
-- The taxonomy is `frontend/src/lib/data/subjects.ts` (mirrored here and in
-- scripts/build_subject_catalog.js). Parent and sub-subject names are stored
-- verbatim from the client's stock sheet so the importer can resolve them.
--
-- This migration:
--   1. adds books.subject / books.sub_subject,
--   2. classifies existing rows from `metadata.sub_subject` (written by the
--      stock import) so nothing stays on an off-taxonomy shelf,
--   3. enforces the taxonomy with a CHECK constraint.
-- Run scripts/build_subject_catalog.js afterwards to set category_id.

alter table books add column if not exists subject text;
alter table books add column if not exists sub_subject text;

comment on column books.subject is
  'Parent subject from the stock sheet (e.g. Engineering); must match subjects.ts';
comment on column books.sub_subject is
  'Sub-subject from the stock sheet (e.g. Electronics); must match subjects.ts';

-- Taxonomies. Keep in sync with frontend/src/lib/data/subjects.ts.
create or replace function public.allied_subject_names()
returns text[]
language sql
immutable
as $$
  select array[
    'Medicine & Healthcare', 'Business & Management Sciences', 'Social Sciences',
    'Science & Technology', 'Engineering', 'Books for School', 'Urdu Literature'
  ]::text[];
$$;


create or replace function public.allied_sub_subject_names()
returns text[]
language sql
immutable
as $$
  select array[
    -- Medicine & Healthcare
    'Anatomy', 'Anesthesia', 'Biochemistry', 'Cancer', 'Cardiac Surgery',
    'Cardiology', 'Community Medicine', 'Dentistry', 'Dermatology',
    'Endocrinology', 'ENT', 'Forensic Medicine', 'Gastroenterology',
    'Gyn & Obs', 'Hematology', 'Medical Education', 'Medical Lab Technology',
    'Medicine', 'Neurology & Neurosurgery', 'Nursing', 'Ophthalmology',
    'Orthopedics', 'Pathology', 'Pediatric Surgery', 'Pediatrics',
    'Pharmacology', 'Pharmacy', 'Physiology', 'Physiotherapy',
    'Plastic Surgery', 'Psychiatry', 'Radiology', 'Respiratory Diseases',
    'Surgery', 'Urology & Nephrology',
    -- Business & Management Sciences
    'Accounting', 'Administrative Science', 'Banking & Finance',
    'Business Studies', 'Marketing', 'Management Sciences',
    'Tourism & Hotel Management',
    -- Social Sciences
    'Economics', 'Education', 'English Language', 'English Literature',
    'Gender Studies', 'Geography', 'History', 'Home Economics',
    'Islamic Studies', 'Law', 'Library Science', 'Media Studies',
    'Pakistan Studies', 'Philosophy', 'Physical Education',
    'Political Science & IR', 'Psychology', 'Research Methodology',
    'Sociology & Social Work', 'Special Education', 'Reference',
    -- Science & Technology
    'Agriculture', 'Artificial Intelligence', 'Biotechnology', 'Botany',
    'Chemistry', 'Computer Science', 'Cyber Security', 'Data Science',
    'Environment', 'Fishery', 'Food & Nutrition', 'Mathematics',
    'Microbiology & Genetics', 'Physics', 'Software Engineering',
    'Statistics', 'Veterinary Science', 'Zoology / Biology',
    -- Engineering
    'Architecture', 'Biomedical Engineering', 'Chemical Engineering',
    'Civil Engineering', 'Electrical Engineering', 'Electronics', 'Energy',
    'Fine Art', 'Geology', 'Industrial Engineering', 'Mechanical Engineering',
    'Mechatronics & Control Engineering', 'Metallurgy & Material Science',
    'Petroleum Engineering', 'Telecommunication Engineering',
    'Textile & Fashion', 'Transportation Engineering', 'Urban Planning', 'Water',
    -- Books for School
    'Books for Children'
  ]::text[];
$$;

-- Parent subject that owns each sub-subject (single place to change the mapping).
create or replace function public.allied_subject_of(p_sub_subject text)
returns text
language sql
immutable
as $$
  select case
    when p_sub_subject is null then null
    when p_sub_subject in ('Anatomy', 'Anesthesia', 'Biochemistry', 'Cancer',
      'Cardiac Surgery', 'Cardiology', 'Community Medicine', 'Dentistry',
      'Dermatology', 'Endocrinology', 'ENT', 'Forensic Medicine',
      'Gastroenterology', 'Gyn & Obs', 'Hematology', 'Medical Education',
      'Medical Lab Technology', 'Medicine', 'Neurology & Neurosurgery',
      'Nursing', 'Ophthalmology', 'Orthopedics', 'Pathology',
      'Pediatric Surgery', 'Pediatrics', 'Pharmacology', 'Pharmacy',
      'Physiology', 'Physiotherapy', 'Plastic Surgery', 'Psychiatry',
      'Radiology', 'Respiratory Diseases', 'Surgery', 'Urology & Nephrology')
      then 'Medicine & Healthcare'
    when p_sub_subject in ('Accounting', 'Administrative Science',
      'Banking & Finance', 'Business Studies', 'Marketing',
      'Management Sciences', 'Tourism & Hotel Management')
      then 'Business & Management Sciences'
    when p_sub_subject in ('Economics', 'Education', 'English Language',
      'English Literature', 'Gender Studies', 'Geography', 'History',
      'Home Economics', 'Islamic Studies', 'Law', 'Library Science',
      'Media Studies', 'Pakistan Studies', 'Philosophy', 'Physical Education',
      'Political Science & IR', 'Psychology', 'Research Methodology',
      'Sociology & Social Work', 'Special Education', 'Reference')
      then 'Social Sciences'
    when p_sub_subject in ('Agriculture', 'Artificial Intelligence',
      'Biotechnology', 'Botany', 'Chemistry', 'Computer Science',
      'Cyber Security', 'Data Science', 'Environment', 'Fishery',
      'Food & Nutrition', 'Mathematics', 'Microbiology & Genetics', 'Physics',
      'Software Engineering', 'Statistics', 'Veterinary Science',
      'Zoology / Biology')
      then 'Science & Technology'
    when p_sub_subject in ('Architecture', 'Biomedical Engineering',
      'Chemical Engineering', 'Civil Engineering', 'Electrical Engineering',
      'Electronics', 'Energy', 'Fine Art', 'Geology', 'Industrial Engineering',
      'Mechanical Engineering', 'Mechatronics & Control Engineering',
      'Metallurgy & Material Science', 'Petroleum Engineering',
      'Telecommunication Engineering', 'Textile & Fashion',
      'Transportation Engineering', 'Urban Planning', 'Water')
      then 'Engineering'
    when p_sub_subject = 'Books for Children' then 'Books for School'
    else null
  end;
$$;


-- ---------------------------------------------------------------------------
-- Backfill from the stock import: clean metadata.sub_subject
-- ---------------------------------------------------------------------------
-- The old stock import wrote the sheet's own spellings, typos included. Fold
-- them onto taxonomy names; anything still unknown stays NULL and is parked on
-- Books for School further down, never on a shelf outside the taxonomy.
update books b
set sub_subject = m.clean
from (
  select
    books.id,
    coalesce(
      fix.mapped,
      nullif(initcap(BTRIM(coalesce(books.metadata->>'sub_subject', ''))), '')
    ) as clean
  from books
  left join lateral (
    select v.mapped
    from (values
      ('ARTIFICAL INTELLIGENCE', 'Artificial Intelligence'),
      ('CYBER SECUIRTY', 'Cyber Security'),
      ('INDUSTRIAL ENGINEERNG', 'Industrial Engineering'),
      ('GYNY AND OBS', 'Gyn & Obs'),
      ('GYNAECOLOGY & OBSTETRICS', 'Gyn & Obs'),
      ('PAEDIATRICS', 'Pediatrics'),
      ('MEDICAL LAB TECHNOLOGY (MLT)', 'Medical Lab Technology'),
      ('LAB TECHNOLOGY', 'Medical Lab Technology'),
      ('ZOOLOGY/BIOLOGY', 'Zoology / Biology'),
      ('MECHATRONICS & CONTROL ENGG.', 'Mechatronics & Control Engineering'),
      ('TELECOMMUNICATION ENGG', 'Telecommunication Engineering'),
      ('TELECOMMUNICATION ENGG.', 'Telecommunication Engineering'),
      ('METALLURGY & MATERIALS SCIENCE', 'Metallurgy & Material Science'),
      ('RESPIRATORY DISEASE', 'Respiratory Diseases'),
      ('POLITICS & INTERNATIONAL RELATIONS', 'Political Science & IR'),
      ('FINE ARTS', 'Fine Art'),
      ('HOME ECONOMICS', 'Home Economics')
    ) as v(raw, mapped)
    where v.raw = UPPER(BTRIM(coalesce(books.metadata->>'sub_subject', '')))
    limit 1
  ) fix on true
) m
where b.id = m.id
  and m.clean is not null
  and m.clean = any (public.allied_sub_subject_names());

-- Parent subject always follows from the (now clean) sub-subject.
update books
set subject = public.allied_subject_of(sub_subject)
where sub_subject is not null
  and subject is distinct from public.allied_subject_of(sub_subject);

-- ---------------------------------------------------------------------------
-- Enforce it: every book has a real subject, and only taxonomy names are valid
-- ---------------------------------------------------------------------------
-- Rows with no resolvable value (e.g. the Pearson school e-books, which carry
-- no sub-subject in the sheet) land on Books for School > Books for Children.
update books
set subject = 'Books for School', sub_subject = 'Books for Children'
where subject is null
   or sub_subject is null
   or subject <> all (public.allied_subject_names())
   or sub_subject <> all (public.allied_sub_subject_names());

alter table books alter column subject set not null;
alter table books alter column sub_subject set not null;

alter table books drop constraint if exists books_subject_taxonomy_check;
alter table books add constraint books_subject_taxonomy_check check (
  subject = any (public.allied_subject_names())
);

alter table books drop constraint if exists books_sub_subject_taxonomy_check;
alter table books add constraint books_sub_subject_taxonomy_check check (
  sub_subject = any (public.allied_sub_subject_names())
);

create index if not exists books_subject_idx on books (subject);
create index if not exists books_sub_subject_idx on books (sub_subject);
create index if not exists books_category_id_idx on books (category_id);

-- Storefront reads still work with the anon key: RLS has a SELECT policy only.
-- category_id is written afterwards by scripts/build_subject_catalog.js, which
-- matches each stock CODE to its book and never touches stock or price.
