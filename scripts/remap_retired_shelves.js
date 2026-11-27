#!/usr/bin/env node
/**
 * Re-home books left on retired shelves (and unclassified books) onto the
 * subject taxonomy.
 *
 * The catalog import only covers books in the client's WEBSITE LIST sheet.
 * 1,482 books in this database are real stock-list titles that are *not* in
 * that sheet, so they kept the category the old keyword classifier gave them —
 * shelves like `medical` or `fiction` that the storefront no longer shows.
 *
 * This maps each retired shelf onto the closest taxonomy shelf:
 *   - `medical`  -> medicine-and-healthcare  (parent shelf: books keep their
 *                   legacy grouping, and the shop rolls children up)
 *   - `fiction`  -> hidden unless a confident match exists (see BELOW)
 *
 * Usage:
 *   node scripts/remap_retired_shelves.js --check   # print the plan only
 *   node scripts/remap_retired_shelves.js           # write the SQL file
 *
 * Output: supabase/subject-catalog-<month>/parts/03_remap_retired.sql
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const month = new Date().toISOString().slice(0, 7);
const OUT_DIR = path.join(ROOT, "supabase", `subject-catalog-${month}`);

/**
 * Retired slug -> taxonomy slug.
 * Parent taxonomy shelves are used where the legacy shelf covered a whole
 * subject (e.g. `medical`); specific children are used where the old shelf was
 * itself narrow (e.g. `nursing`).
 */
const REMAP = {
  // Health sciences
  medical: "medicine-and-healthcare",
  nursing: "medicine-and-healthcare--nursing",
  "health-and-fitness": "medicine-and-healthcare--physiotherapy",

  // Business / management
  business: "business-and-management-sciences",

  // Computing / science
  computer: "science-and-technology--computer-science",
  technology: "science-and-technology",
  science: "science-and-technology",
  mathematics: "science-and-technology--mathematics",
  agriculture: "science-and-technology--agriculture",
  veterinary: "science-and-technology--veterinary-science",
  nature: "science-and-technology--zoology-biology",

  // Social sciences
  "pakistan-studies": "social-sciences--pakistan-studies",
  religion: "social-sciences--islamic-studies",
  history: "social-sciences--history",
  economics: "social-sciences--economics",
  education: "social-sciences--education",
  law: "social-sciences--law",
  psychology: "social-sciences--psychology",
  politics: "social-sciences--political-science-and-ir",
  "middle-eastern-studies": "social-sciences--political-science-and-ir",
  "mass-communication": "social-sciences--media-studies",
  linguistics: "social-sciences--english-language",
  language: "social-sciences--english-language",
  "english-literature": "social-sciences--english-literature",
  "literary-criticism": "social-sciences--english-literature",
  literature: "social-sciences--english-literature",
  reference: "social-sciences--reference",
  philosophy: "social-sciences--philosophy",
  anthropology: "social-sciences--sociology-and-social-work",
  "sports-and-recreation": "social-sciences--physical-education",

  // Engineering / arts
  architecture: "engineering--architecture",
  art: "engineering--fine-art",
  fashion: "engineering--textile-and-fashion",
  "performing-arts": "engineering--fine-art",
  "home-and-interior": "engineering--architecture",

  // Children
  children: "books-for-school--books-for-children",
  "graphic-novels-and-manga": "books-for-school--books-for-children",
};

/**
 * Legacy shelves with no honest home in an academic catalogue. These books are
 * left uncategorised so they show only under "All subjects" instead of being
 * forced onto a shelf that misrepresents them.
 */
const HIDE = [
  "fiction",
  "classics",
  "poetry",
  "cooking",
  "crafts",
  "music",
  "bio-and-autobiography",
  "self-help",
];

const TAXONOMY_FILE = path.join(ROOT, "frontend", "src", "lib", "data", "subjects.ts");

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[/+,.]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}


/* ------------------------------------------------------------------ */
/* Taxonomy                                                            */
/* ------------------------------------------------------------------ */

/** Read `group("Name", [...])` blocks from subjects.ts (no TS execution). */
function readShelves(src) {
  const shelves = new Map(); // slug -> { subject, subSubject }
  const starts = Array.from(src.matchAll(/group\(\s*"([^"]+)"\s*,\s*\[/g));
  const CHILD = /"([^"]+)"(?:\s*,\s*"(?!"?\])[^"]+"\s*(?=\]))?/g;
  for (const start of starts) {
    const openIdx = start.index + start[0].length - 1;
    // Walk brackets so a nested literal cannot end the block early.
    let depth = 0;
    let body = "";
    for (let i = openIdx; i < src.length; i++) {
      if (src[i] === "[") depth++;
      else if (src[i] === "]") {
        depth--;
        if (depth === 0) {
          body = src.slice(openIdx + 1, i);
          break;
        }
      }
    }
    const groupName = start[1];
    const groupSlug = slugify(groupName);
    shelves.set(groupSlug, { subject: groupName, subSubject: null });
    CHILD.lastIndex = 0;
    let m;
    while ((m = CHILD.exec(body))) {
      const parts = m[0]
        .replace(/^\[/, "")
        .split(",")
        .map((p) => p.replace(/["\]]/g, "").trim())
        .filter(Boolean);
      const childName = parts[0];
      const key = parts[1] ? slugify(parts[1]) : slugify(childName);
      shelves.set(`${groupSlug}--${key}`, {
        subject: groupName,
        subSubject: childName,
      });
    }
  }
  return shelves;
}

const shelves = readShelves(fs.readFileSync(TAXONOMY_FILE, "utf8"));
if (!shelves.size) throw new Error(`Could not read taxonomy from ${TAXONOMY_FILE}`);

const missingTargets = [...new Set(Object.values(REMAP))].filter(
  (slug) => !shelves.has(slug)
);
if (missingTargets.length) {
  console.error(
    "REMAP targets that are not in the taxonomy:\n  " + missingTargets.join("\n  ")
  );
  process.exit(1);
}

const hiddenTargets = HIDE.filter((slug) =>
  Object.prototype.hasOwnProperty.call(REMAP, slug)
);
if (hiddenTargets.length) {
  console.error(`These slugs are both remapped and hidden: ${hiddenTargets.join(", ")}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* SQL                                                                 */
/* ------------------------------------------------------------------ */

const q = (v) => "'" + String(v).replace(/'/g, "''") + "'";

const remapValues = Object.entries(REMAP)
  .map(([from, to]) => {
    const shelf = shelves.get(to);
    return `  (${q(from)}, ${q(to)}, ${q(shelf.subject)}, ${
      shelf.subSubject ? q(shelf.subSubject) : "null"
    })`;
  })
  .join(",\n");

const hideValues = HIDE.map((s) => `  (${q(s)})`).join(",\n");

const sql = `-- Re-home books left on retired (legacy) shelves.
-- Generated ${new Date().toISOString()}
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
${remapValues}
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
${hideValues}
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
`;

if (process.argv.includes("--check")) {
  console.log(`taxonomy shelves: ${shelves.size}`);
  console.log(`remap rules: ${Object.keys(REMAP).length}`);
  console.log(`hidden legacy shelves: ${HIDE.length}`);
  console.log("\nremap:");
  for (const [from, to] of Object.entries(REMAP)) {
    const s = shelves.get(to);
    console.log(
      `  ${from.padEnd(24)} -> ${to}${s.subSubject ? "" : "   (parent shelf)"}`
    );
  }
  console.log(`\nhidden: ${HIDE.join(", ")}`);
  console.log("\n--check: plan is valid, nothing written.");
  process.exit(0);
}

fs.mkdirSync(path.join(OUT_DIR, "parts"), { recursive: true });
const out = path.join(OUT_DIR, "parts", "03_remap_retired.sql");
fs.writeFileSync(out, sql, "utf8");
console.log(`Wrote ${path.relative(ROOT, out)}`);
console.log(
  `  ${Object.keys(REMAP).length} remap rules, ${HIDE.length} hidden legacy shelves`
);
