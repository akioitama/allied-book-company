-- Re-home books left on retired (legacy) shelves.
-- Generated 2026-11-27T12:22:23.926Z
--
-- The catalog import only covers books in WEBSITE LIST. Books that are real
-- stock but not in that sheet still sit on shelves the storefront no longer
-- shows (medical, business, fiction, ...).
--
--   1. known legacy shelves -> the closest taxonomy shelf
--   2. legacy shelves with no honest home -> no category (search-only)
--
-- Only category_id / subject / sub_subject change. Stock and price are NOT
-- touched. Safe to re-run.

begin;

-- 1) Re-home onto the taxonomy ------------------------------------------------
with map(legacy_slug, shelf_slug, subject, sub_subject) as (
  values
  ('medical', 'medicine-and-healthcare', 'Medicine & Healthcare', null),
  ('nursing', 'medicine-and-healthcare--nursing', 'Medicine & Healthcare', 'Nursing'),
  ('health-and-fitness', 'medicine-and-healthcare--physiotherapy', 'Medicine & Healthcare', 'Physiotherapy'),
  ('business', 'business-and-management-sciences', 'Business & Management Sciences', null),
  ('computer', 'science-and-technology--computer-science', 'Science & Technology', 'Computer Science'),
  ('technology', 'science-and-technology', 'Science & Technology', null),
  ('science', 'science-and-technology', 'Science & Technology', null),
  ('mathematics', 'science-and-technology--mathematics', 'Science & Technology', 'Mathematics'),
  ('agriculture', 'science-and-technology--agriculture', 'Science & Technology', 'Agriculture'),
  ('veterinary', 'science-and-technology--veterinary-science', 'Science & Technology', 'Veterinary Science'),
  ('nature', 'science-and-technology--zoology-biology', 'Science & Technology', 'Zoology / Biology'),
  ('pakistan-studies', 'social-sciences--pakistan-studies', 'Social Sciences', 'Pakistan Studies'),
  ('religion', 'social-sciences--islamic-studies', 'Social Sciences', 'Islamic Studies'),
  ('history', 'social-sciences--history', 'Social Sciences', 'History'),
  ('economics', 'social-sciences--economics', 'Social Sciences', 'Economics'),
  ('education', 'social-sciences--education', 'Social Sciences', 'Education'),
  ('law', 'social-sciences--law', 'Social Sciences', 'Law'),
  ('psychology', 'social-sciences--psychology', 'Social Sciences', 'Psychology'),
  ('politics', 'social-sciences--political-science-and-ir', 'Social Sciences', 'Political Science & IR'),
  ('middle-eastern-studies', 'social-sciences--political-science-and-ir', 'Social Sciences', 'Political Science & IR'),
  ('mass-communication', 'social-sciences--media-studies', 'Social Sciences', 'Media Studies'),
  ('linguistics', 'social-sciences--english-language', 'Social Sciences', 'English Language'),
  ('language', 'social-sciences--english-language', 'Social Sciences', 'English Language'),
  ('english-literature', 'social-sciences--english-literature', 'Social Sciences', 'English Literature'),
  ('literary-criticism', 'social-sciences--english-literature', 'Social Sciences', 'English Literature'),
  ('literature', 'social-sciences--english-literature', 'Social Sciences', 'English Literature'),
  ('reference', 'social-sciences--reference', 'Social Sciences', 'Reference'),
  ('philosophy', 'social-sciences--philosophy', 'Social Sciences', 'Philosophy'),
  ('anthropology', 'social-sciences--sociology-and-social-work', 'Social Sciences', 'Sociology & Social Work'),
  ('sports-and-recreation', 'social-sciences--physical-education', 'Social Sciences', 'Physical Education'),
  ('architecture', 'engineering--architecture', 'Engineering', 'Architecture'),
  ('art', 'engineering--fine-art', 'Engineering', 'Fine Art'),
  ('fashion', 'engineering--textile-and-fashion', 'Engineering', 'Textile & Fashion'),
  ('performing-arts', 'engineering--fine-art', 'Engineering', 'Fine Art'),
  ('home-and-interior', 'engineering--architecture', 'Engineering', 'Architecture'),
  ('children', 'books-for-school--books-for-children', 'Books for School', 'Books for Children'),
  ('graphic-novels-and-manga', 'books-for-school--books-for-children', 'Books for School', 'Books for Children')
)
update public.books b
   set category_id = c.id,
       subject = m.subject,
       sub_subject = m.sub_subject
  from map m
  join public.categories legacy on legacy.slug = m.legacy_slug
  join public.categories c on c.slug = m.shelf_slug
 where b.category_id = legacy.id;

-- 2) Legacy shelves with no taxonomy equivalent -------------------------------
with hide(slug) as (
  values
  ('fiction'),
  ('classics'),
  ('poetry'),
  ('cooking'),
  ('crafts'),
  ('music'),
  ('bio-and-autobiography'),
  ('self-help')
)
update public.books b
   set category_id = null
  from hide h
  join public.categories c on c.slug = h.slug
 where b.category_id = c.id;

commit;

-- Verification -----------------------------------------------------------------
select
  count(*)                                                          as books_total,
  count(*) filter (where b.category_id is null)                     as no_category,
  count(*) filter (where c.is_active is false)                      as on_retired,
  count(*) filter (where c.is_active)                               as on_taxonomy
from public.books b
left join public.categories c on c.id = b.category_id;
