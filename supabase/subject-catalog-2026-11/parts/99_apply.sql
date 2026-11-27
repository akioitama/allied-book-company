-- Apply the subject catalog (run after 00_setup + every insert part).
-- Only category_id / subject / sub_subject change; stock and price are NOT
-- touched. Requires migrations/005_subject_taxonomy.sql.

-- 1) Every category in the staging table must exist on the site.
do $$
declare missing text;
begin
  select string_agg(distinct s.slug, ', ')
    into missing
    from public.stock_staging s
   where not exists (select 1 from public.categories c where c.slug = s.slug);
  if missing is not null then
    raise exception 'Unknown shelf slug(s) in staging: %. Run migrations/005_subject_taxonomy.sql (or the seam script) first.', missing;
  end if;
end $$;

-- 2) Match by stock CODE (metadata.sku), then by ISBN where the sheet had no
--    CODE (those staging rows carry a synthetic 'ISBN:...' code).
with matched as (
  select b.id, s.slug, s.subject, s.sub_subject
    from public.stock_staging s
    join public.books b on b.metadata->>'sku' = s.code
   where s.code not like 'ISBN:%'
  union all
  select b.id, s.slug, s.subject, s.sub_subject
    from public.stock_staging s
    join public.books b on s.code like 'ISBN:%'
   where (b.metadata->>'sku' is null or b.metadata->>'sku' = '')
     and s.isbn is not null
     and (b.isbn = s.isbn or b.isbn13 = s.isbn)
), picked as (
  select distinct on (id) id, slug, subject, sub_subject from matched
)
update public.books b
   set category_id = c.id,
       subject = p.subject,
       sub_subject = p.sub_subject
  from picked p
  join public.categories c on c.slug = p.slug
 where b.id = p.id;

-- 3) Verify. category_id is what the storefront browses, so a book is in good
-- shape when its category is one of the taxonomy shelves loaded by
-- 01_categories.sql. subject/sub_subject are the sheet's names and are checked
-- by the constraints added in migrations/005_subject_taxonomy.sql.
select
  (select count(*) from public.stock_staging) as staging_rows,
  (select count(*) from public.books) as books_total,
  (select count(*) from public.books where category_id is null) as without_category,
  (select count(*) from public.books b
     join public.categories c on c.id = b.category_id
    where c.name like '% (retired)') as on_retired_shelf,
  (select count(*) from public.stock_staging s
    where not exists (
      select 1 from public.books b
       where (s.code not like 'ISBN:%' and b.metadata->>'sku' = s.code)
          or (s.code like 'ISBN:%' and s.isbn is not null
              and (b.isbn = s.isbn or b.isbn13 = s.isbn))
    )) as staged_not_matched;
