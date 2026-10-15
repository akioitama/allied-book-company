import type { Category } from "@/types";

/**
 * Static nav taxonomy. Names/slugs mirror the DB `categories` table exactly
 * (kept in sync by scripts/categorize_books.py) so every nav link resolves
 * to a real, populated shelf.
 */
const ALL_CATEGORIES: ReadonlyArray<readonly [name: string, slug: string]> = [
  ["Adult Colouring Books", "adult-colouring-books"],
  ["Agriculture", "agriculture"],
  ["Anthropology", "anthropology"],
  ["Antiques & Collectibles", "antiques-and-collectibles"],
  ["Archaeology", "archaeology"],
  ["Architecture", "architecture"],
  ["Art", "art"],
  ["Automobiles", "automobiles"],
  ["Aviation", "aviation"],
  ["Bio & Autobiography", "bio-and-autobiography"],
  ["Body, Mind & Spirit", "body-mind-and-spirit"],
  ["Business", "business"],
  ["Children", "children"],
  ["Classics", "classics"],
  ["Collector's Editions", "collectors-editions"],
  ["Computer", "computer"],
  ["Cooking", "cooking"],
  ["Crafts", "crafts"],
  ["Economics", "economics"],
  ["Education", "education"],
  ["Engineering", "engineering"],
  ["English Literature", "english-literature"],
  ["Fashion", "fashion"],
  ["Fiction", "fiction"],
  ["Gardening & Landscaping", "gardening-and-landscaping"],
  ["Graphic Novels & Manga", "graphic-novels-and-manga"],
  ["Health & Fitness", "health-and-fitness"],
  ["History", "history"],
  ["Home & Interior", "home-and-interior"],
  ["Humour", "humour"],
  ["Language", "language"],
  ["Law", "law"],
  ["Library & Information Science", "library-information-science"],
  ["Linguistics", "linguistics"],
  ["Literary Criticism", "literary-criticism"],
  ["Literature", "literature"],
  ["Mass Communication", "mass-communication"],
  ["Mathematics", "mathematics"],
  ["Medical", "medical"],
  ["Middle Eastern Studies", "middle-eastern-studies"],
  ["Music", "music"],
  ["Nature", "nature"],
  ["Nursing", "nursing"],
  ["Pakistan Studies", "pakistan-studies"],
  ["Performing Arts", "performing-arts"],
  ["Pets", "pets"],
  ["Philosophy", "philosophy"],
  ["Photography", "photography"],
  ["Poetry", "poetry"],
  ["Politics", "politics"],
  ["Psychology", "psychology"],
  ["Reference", "reference"],
  ["Religion", "religion"],
  ["Science", "science"],
  ["Self Help", "self-help"],
  ["Sports & Recreation", "sports-and-recreation"],
  ["Technology", "technology"],
  ["Urdu Literature", "urdu-literature"],
  ["Veterinary", "veterinary"],
];

export const categories: Category[] = ALL_CATEGORIES.map(([name, slug], i) => ({
  id: `cat-${String(i + 1).padStart(3, "0")}`,
  slug,
  name,
  coordinate_label: "",
  description: `Browse titles in ${name}.`,
}));

/** Shown as quick links in the secondary header (fills the bar). */
export const POPULAR_CATEGORY_SLUGS = [
  "medical",
  "english-literature",
  "urdu-literature",
  "bio-and-autobiography",
  "business",
  "classics",
  "collectors-editions",
  "fiction",
  "graphic-novels-and-manga",
  "history",
  "literature",
  "philosophy",
  "politics",
  "religion",
  "science",
  "self-help",
] as const;

export const popularCategories = POPULAR_CATEGORY_SLUGS.map(
  (slug) => categories.find((c) => c.slug === slug)!
).filter(Boolean);

export function getCategoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug);
}
