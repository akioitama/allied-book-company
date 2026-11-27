import type { Category } from "@/types";
import { SUBJECT_SHELVES, SUBJECT_GROUPS } from "@/lib/data/subjects";

/**
 * Nav taxonomy — derived from `subjects.ts`, never hand-written.
 *
 * Every shelf a book can sit on is a subject (parent) or a sub-subject, so the
 * shop can only ever browse shelves that appear in the header's Subjects menu.
 * Parent subjects come first, then each parent's sub-subjects, so the generic
 * "All subjects" dropdown reads as a tree.
 */
export const categories: Category[] = SUBJECT_SHELVES.map((shelf, i) => ({
  id: `cat-${String(i + 1).padStart(3, "0")}`,
  slug: shelf.slug,
  name: shelf.childName
    ? `${shelf.groupName} · ${shelf.childName}`
    : shelf.groupName,
  coordinate_label: "",
  description: shelf.childName
    ? `Browse ${shelf.childName} titles in ${shelf.groupName}.`
    : `Browse titles in ${shelf.groupName}.`,
}));

/** Shown as quick links in the secondary header (fills the bar). */
export const POPULAR_CATEGORY_SLUGS = [
  "medical",
  "medical--cardiology",
  "business--management-sciences",
  "social-sciences--english-literature",
  "social-sciences--history",
  "science-and-technology--computer-science",
  "science-and-technology--artificial-intelligence",
  "science-and-technology--mathematics",
  "engineering--civil-engineering",
  "engineering--mechanical-engineering",
  "engineering--architecture",
  "books-for-school",
  "urdu-literature",
] as const;

export const popularCategories = POPULAR_CATEGORY_SLUGS.map(
  (slug) => categories.find((c) => c.slug === slug)!
).filter(Boolean);

export function getCategoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug);
}

/** Parent subjects only — the top level of the taxonomy. */
export const parentCategories: Category[] = SUBJECT_GROUPS.map((g) =>
  categories.find((c) => c.slug === g.slug)!
).filter(Boolean);

