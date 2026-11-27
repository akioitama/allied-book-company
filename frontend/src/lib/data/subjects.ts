/**
 * Client subject taxonomy — the ONLY shelves the shop recognises.
 *
 * Structure: parent subject → sub-subjects (one level).
 *
 * Source: the client's `WEBSITE LIST` stock sheet, whose `CATEGORY` column is a
 * parent subject and whose `SUBJECT` column is a sub-subject under it. Two
 * names in that sheet were missing here (Artificial Intelligence, Software
 * Engineering) and are now part of Science & Technology, so every book in the
 * stock list lands on a real shelf.
 *
 * This module is the single source of truth: `@/lib/data/categories` is derived
 * from it, and `scripts/build_subject_catalog.js` writes books.category_id from
 * these exact names/slugs.
 */

export type SubSubject = {
  /** Must match the stock sheet `SUBJECT` value verbatim. */
  name: string;
  /** Globally unique shelf slug (two parents may share a child name). */
  slug: string;
  /** Unique within the parent subject — stable per-subject URL key. */
  key: string;
};

export type SubjectGroup = {
  /** Must match the stock sheet `CATEGORY` value verbatim. */
  name: string;
  slug: string;
  children: SubSubject[];
};

/** Every slug a book's category_id may point at. */
export type SubjectShelf = {
  slug: string;
  name: string;
  groupName: string;
  groupSlug: string;
  /** Set for sub-subjects, null for the parent "view all" shelf. */
  childName: string | null;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[/+,.]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * A sub-subject is written `"Name"`, or `["Name", "key"]` to pin its URL key
 * (keeps an old link working). Names must be unique across the whole taxonomy,
 * because every sub-subject has exactly one shelf.
 */
type ChildSpec = string | [name: string, key: string];

function group(name: string, children: ChildSpec[]): SubjectGroup {
  const slug = slugify(name);
  return {
    name,
    slug,
    children: children.map((child) => {
      const [childName, key] = Array.isArray(child)
        ? child
        : [child, slugify(child)];
      return { name: childName, key, slug: `${slug}--${key}` };
    }),
  };
}

/**
 * Hierarchy from the client's stock sheet: each `CATEGORY` is a subject and
 * each `SUBJECT` under it is a sub-subject. Display names are cleaned lightly;
 * parent and sub-subject names still match the sheet so the importer can
 * resolve them.
 */
export const SUBJECT_GROUPS: SubjectGroup[] = [
  group("Medicine & Healthcare", [
    "Anatomy",
    "Anesthesia",
    "Biochemistry",
    "Cancer",
    "Cardiac Surgery",
    "Cardiology",
    "Community Medicine",
    "Dentistry",
    "Dermatology",
    "Endocrinology",
    "ENT",
    "Forensic Medicine",
    "Gastroenterology",
    "Gyn & Obs",
    "Hematology",
    "Medical Education",
    "Medical Lab Technology",
    "Medicine",
    "Microbiology & Genetics",
    "Neurology & Neurosurgery",
    "Nursing",
    "Ophthalmology",
    "Orthopedics",
    "Pathology",
    "Pediatric Surgery",
    "Pediatrics",
    "Pharmacology",
    "Pharmacy",
    "Physiology",
    "Physiotherapy",
    "Plastic Surgery",
    "Psychiatry",
    "Radiology",
    "Respiratory Diseases",
    "Surgery",
    "Urology & Nephrology",
  ]),
  group("Business & Management Sciences", [
    "Accounting",
    "Administrative Science",
    "Banking & Finance",
    "Business Studies",
    "Marketing",
    "Management Sciences",
    "Tourism & Hotel Management",
  ]),
  group("Social Sciences", [
    "Economics",
    "Education",
    "English Language",
    "English Literature",
    "Gender Studies",
    "Geography",
    "History",
    "Home Economics",
    "Islamic Studies",
    "Law",
    "Library Science",
    "Media Studies",
    "Pakistan Studies",
    "Philosophy",
    "Physical Education",
    "Political Science & IR",
    "Psychology",
    "Research Methodology",
    "Sociology & Social Work",
    "Special Education",
    "Reference",
  ]),
  group("Science & Technology", [
    "Agriculture",
    "Artificial Intelligence",
    "Biotechnology",
    "Botany",
    "Chemistry",
    "Computer Science",
    "Cyber Security",
    "Data Science",
    "Environment",
    "Fishery",
    "Food & Nutrition",
    "Mathematics",
    "Physics",
    "Software Engineering",
    "Statistics",
    "Veterinary Science",
    "Zoology / Biology",
  ]),
  group("Engineering", [
    "Architecture",
    "Biomedical Engineering",
    "Chemical Engineering",
    "Civil Engineering",
    "Electrical Engineering",
    "Electronics",
    "Energy",
    "Fine Art",
    "Geology",
    "Industrial Engineering",
    "Mechanical Engineering",
    "Mechatronics & Control Engineering",
    "Metallurgy & Material Science",
    "Petroleum Engineering",
    "Telecommunication Engineering",
    "Textile & Fashion",
    "Transportation Engineering",
    "Urban Planning",
    "Water",
  ]),
  group("Books for School", ["Books for Children"]),
  group("Urdu Literature", []),
];

/** Parent subject name → group. */
export const SUBJECT_GROUP_BY_NAME = new Map(
  SUBJECT_GROUPS.map((g) => [g.name, g])
);

/** Parent subject slug → group. */
export const SUBJECT_GROUP_BY_SLUG = new Map(
  SUBJECT_GROUPS.map((g) => [g.slug, g])
);

/** Parent shelf plus every sub-subject shelf, in menu order. */
export const SUBJECT_SHELVES: SubjectShelf[] = SUBJECT_GROUPS.flatMap((g) => [
  { slug: g.slug, name: g.name, groupName: g.name, groupSlug: g.slug, childName: null },
  ...g.children.map((c) => ({
    slug: c.slug,
    name: c.name,
    groupName: g.name,
    groupSlug: g.slug,
    childName: c.name,
  })),
]);

/** Shelf slug → shelf. */
export const SUBJECT_SHELF_BY_SLUG = new Map(
  SUBJECT_SHELVES.map((s) => [s.slug, s])
);

/** Sub-subject name → shelf (names are unique across the taxonomy). */
export const SUBJECT_SHELF_BY_NAME = new Map(
  SUBJECT_GROUPS.flatMap((g) =>
    g.children.map(
      (c) =>
        [c.name, SUBJECT_SHELF_BY_SLUG.get(c.slug)!] as [
          string,
          SubjectShelf,
        ]
    )
  )
);

/** Parent subject that owns a sub-subject name. */
export function parentOfSubSubject(name: string): SubjectGroup | undefined {
  return SUBJECT_GROUPS.find((g) => g.children.some((c) => c.name === name));
}

/** Shop URL for a parent subject. */
export function subjectHref(groupName: string): string {
  const group = SUBJECT_GROUP_BY_NAME.get(groupName);
  return `/shop?category=${encodeURIComponent(group?.slug ?? slugify(groupName))}`;
}

/** Shop URL for a sub-subject: parent shelf + sub key. */
export function subSubjectHref(
  group: SubjectGroup | string,
  child: SubSubject | string
): string {
  const groupName = typeof group === "string" ? group : group.name;
  const childName = typeof child === "string" ? child : child.name;
  const parent = SUBJECT_GROUP_BY_NAME.get(groupName);
  const shelf = parent?.children.find((c) => c.name === childName);
  const params = new URLSearchParams();
  if (parent) params.set("category", parent.slug);
  if (shelf) params.set("sub", shelf.key);
  else params.set("q", childName);
  return `/shop?${params.toString()}`;
}

/** Display label for a shelf slug, e.g. "Engineering · Electronics". */
export function shelfLabel(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const shelf = SUBJECT_SHELF_BY_SLUG.get(slug);
  if (!shelf) return null;
  return shelf.childName ? `${shelf.groupName} · ${shelf.childName}` : shelf.groupName;
}

/**
 * Slugs to query when a shopper picks a subject.
 * Parent → the parent shelf plus every sub-subject shelf under it, so the
 * parent view still returns titles after books moved to sub-subject shelves.
 */
export function shelfSlugsFor(
  groupSlug: string | null | undefined,
  subKey?: string | null
): string[] {
  const group = groupSlug ? SUBJECT_GROUP_BY_SLUG.get(groupSlug) : undefined;
  if (!group) return [];
  if (subKey) {
    const child = group.children.find((c) => c.key === subKey);
    return child ? [child.slug] : [group.slug];
  }
  return [group.slug, ...group.children.map((c) => c.slug)];
}
