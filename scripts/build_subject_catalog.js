#!/usr/bin/env node
/**
 * Build the subject-catalog import from the client's WEBSITE LIST sheet.
 *
 * Every book must sit on a subject shelf that exists in the site taxonomy
 * (`frontend/src/lib/data/subjects.ts`). That taxonomy is read straight from the
 * TypeScript file, so this script can never invent a shelf the header does not
 * show.
 *
 * Usage:
 *   node scripts/build_subject_catalog.js --check        # validate only, no files
 *   node scripts/build_subject_catalog.js --check --check-sql   # + SQL taxonomy sync
 *   node scripts/build_subject_catalog.js                # write the SQL + CSV
 *   node scripts/build_subject_catalog.js --src "C:/path/to/list.csv" --out supabase/x
 *
 * Output (supabase/subject-catalog-<YYYY-MM>/, or --out):
 *   subjects_staging.csv      code, isbn, title, subject, sub_subject, slug
 *   parts/00_setup.sql        staging table (stock_staging, subject columns only)
 *   parts/02_insert_part_NN.sql
 *   parts/99_apply.sql        writes category_id/subject/sub_subject, verifies
 *   README.md                 run order
 *
 * What it writes to `books` (matched by metadata.sku = CODE, else ISBN):
 *   category_id, subject, sub_subject
 * It never touches stock, price, format or any other column.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TAXONOMY_FILE = path.join(ROOT, "frontend", "src", "lib", "data", "subjects.ts");
const MIGRATION_FILE = path.join(
  ROOT,
  "supabase",
  "migrations",
  "005_subject_taxonomy.sql"
);
const DEFAULT_SRC = path.join(
  "C:/Users/LENOVO/Downloads",
  "WEBSITE LIST 04-11-2026-Sheet1,WEBSITE LIST 04-11-2026-Sheet2",
  "WEBSITE LIST 04-11-2026-Sheet1.csv"
);
const BATCH = 200;

/* ------------------------------------------------------------------ */
/* Taxonomy (read from subjects.ts)                                    */
/* ------------------------------------------------------------------ */

const GROUP_START = /group\(\s*"([^"]+)"\s*,\s*\[/g;
// `"Name"` or `["Name", "key"]`. Requiring `,` followed by another quote means
// two consecutive names can never be swallowed as a name/key pair.
const CHILD_ENTRY = /"([^"]+)"(?:\s*,\s*"(?!"?\])[^"]+"\s*(?=\]))?/g;

/**
 * Slice out the body of the `group("Name", [ ... ])` call that starts at
 * `openIdx`, counting brackets so nested calls or array literals inside the
 * block can't end it early.
 */
function groupBody(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === "[") depth += 1;
    else if (c === "]") {
      depth -= 1;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return src.slice(openIdx + 1);
}

/**
 * Parse `group("Name", [...])` blocks from subjects.ts into the taxonomy. Only
 * literal arrays/strings are read — no TS execution, no extra dependencies.
 */
function readTaxonomy(src) {
  const groups = [];
  const starts = Array.from(src.matchAll(GROUP_START));
  starts.forEach((start) => {
    // GROUP_START ends with the `[`, so the body starts there.
    const openIdx = start.index + start[0].length - 1;
    const body = groupBody(src, openIdx);
    const name = start[1];
    const slug = slugify(name);
    const children = [];
    CHILD_ENTRY.lastIndex = 0;
    let child;
    while ((child = CHILD_ENTRY.exec(body))) {
      // A tuple arrives as `["Name", "key"]`; a plain entry as `"Name"`.
      const tuple = child[0]
        .replace(/^\[/, "")
        .split(",")
        .map((part) => part.replace(/["\]]/g, "").trim())
        .filter(Boolean);
      const childName = tuple[0] ?? child[1];
      // `["Name", "key"]` gives the shelf a custom key — used to keep an
      // existing URL stable or to disambiguate a name under two parents.
      const key = tuple[1] ? slugify(tuple[1]) : slugify(childName);
      children.push({ name: childName, slug: `${slug}--${key}` });
    }
    groups.push({ name, slug, children });
  });
  if (!groups.length) {
    throw new Error(`Could not read the taxonomy from ${TAXONOMY_FILE}`);
  }
  return groups;
}

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
/* CSV + normalisation                                                 */
/* ------------------------------------------------------------------ */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c !== "\r") cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function csvCell(value) {
  if (value == null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function cleanIsbn(value) {
  const s = String(value || "").replace(/[^0-9Xx]/g, "");
  return s || null;
}

/**
 * SQL string literal. Two things in the stock sheet would otherwise break the
 * generated INSERT batches:
 *   - a newline inside a title splits the row across lines (and leaves the
 *     quote open, which makes Postgres swallow the statements that follow),
 *   - a semicolon inside a title ends the statement early.
 * Both are folded to harmless characters *inside the literal*; apostrophes use
 * the standard '' escape.
 */
function sqlStr(value) {
  if (value == null) return "NULL";
  const s = String(value)
    .replace(/\r\n|\r|\n/g, " ") // one row must stay on one line
    .replace(/\s+/g, " ")
    .trim()
    .replace(/;/g, ",") // ';' terminates a statement in these files
    .replace(/'/g, "''");
  return "'" + s + "'";
}

/**
 * Stock-sheet `SUBJECT` values that differ from the taxonomy name: typos in the
 * client's sheet, plurals, and names the menu used to group differently.
 */
const SUB_SUBJECT_ALIASES = new Map(
  Object.entries({
    "ARTIFICAL INTELLIGENCE": "Artificial Intelligence",
    "CYBER SECUIRTY": "Cyber Security",
    "INDUSTRIAL ENGINEERNG": "Industrial Engineering",
    "GYNY AND OBS": "Gyn & Obs",
    "PAEDIATRICS": "Pediatrics",
    "MEDICAL LAB TECHNOLOGY (MLT)": "Medical Lab Technology",
    "LAB TECHNOLOGY": "Medical Lab Technology",
    "MECHATRONICS & CONTROL ENGG.": "Mechatronics & Control Engineering",
    "TELECOMMUNICATION ENGG": "Telecommunication Engineering",
    "METALLURGY & MATERIALS SCIENCE": "Metallurgy & Material Science",
    "RESPIRATORY DISEASE": "Respiratory Diseases",
    "POLITICS & INTERNATIONAL RELATIONS": "Political Science & IR",
    "ZOOLOGY/BIOLOGY": "Zoology / Biology",
    "FINE ARTS": "Fine Art",
    "ENVIRONMENT": "Environment",
    "ENVIRONMENTAL SCIENCE": "Environment",
    "ENVIRONMENTAL SCIENCES": "Environment",
  })
);

/** Stock-sheet `CATEGORY` values → parent subject names. */
const SUBJECT_ALIASES = new Map(
  Object.entries({
    "SOCIAL SCIECNES": "Social Sciences",
    "MEDICINE & HEALTH SCIENCE": "Medicine & Healthcare",
    "ART & ARCHITECTURE": "Engineering",
    "COMPUTER SCIENCES": "Science & Technology",
    "PHYSICAL SCIENCES": "Science & Technology",
    "LIFE SCIENCES": "Science & Technology",
    "FOOD SCIENCES": "Science & Technology",
    "PHYSICAL EDUCATION": "Social Sciences",
    "DENTISTRY": "Medicine & Healthcare",
    "OTHERS": "Books for School",
  })
);

/**
 * Sub-subjects the menu keeps in exactly one parent. When the sheet files a
 * book under a different parent, the shelf still resolves to this home.
 */
const SHELF_HOME = new Map(
  Object.entries({
    "TEXTILE & FASHION": "Engineering",
    "TEXTILE & FASHION DESIGN": "Engineering",
    "FINE ART": "Engineering",
    "FINE ARTS": "Engineering",
    "ELECTRONICS": "Engineering",
    "MICROBIOLOGY & GENETICS": "Science & Technology",
  })
);

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}


/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const CHECK_ONLY = flag("--check");
const SRC = arg("--src") ? path.resolve(arg("--src")) : DEFAULT_SRC;
const month = new Date().toISOString().slice(0, 7);
const OUT_DIR = arg("--out")
  ? path.resolve(arg("--out"))
  : path.join(ROOT, "supabase", `subject-catalog-${month}`);

const taxonomy = readTaxonomy(fs.readFileSync(TAXONOMY_FILE, "utf8"));
const groupByName = new Map(taxonomy.map((g) => [normalizeName(g.name), g]));
const childKey = new Map(); // "SUBJECT \0 SUB SUBJECT" → child
const childByName = new Map();
for (const g of taxonomy) {
  for (const c of g.children) {
    childKey.set(`${normalizeName(g.name)}\u0000${normalizeName(c.name)}`, c);
    if (!childByName.has(normalizeName(c.name))) {
      childByName.set(normalizeName(c.name), c);
    }
  }
}

if (!fs.existsSync(SRC)) {
  console.error(`Source sheet not found: ${SRC}`);
  process.exit(2);
}

const rows = parseCsv(fs.readFileSync(SRC, "utf8"));
const header = rows.shift().map((h) => h.trim().toUpperCase());
const col = (name) => header.indexOf(name);
const COL = {
  category: col("CATEGORY"),
  subject: col("SUBJECT"),
  code: col("CODE"),
  isbn: col("ISBN"),
  title: col("TITLE"),
  qty: col("QTY"),
};

const problems = [];
const staged = new Map(); // code → row (first wins; codes are unique)
const byIsbn = new Map();
const shelfCounts = new Map();
let emptyRows = 0;

for (const r of rows) {
  const rawCategory = r[COL.category] || "";
  const rawSubject = r[COL.subject] || "";
  const code = (r[COL.code] || "").trim();
  const isbn = cleanIsbn(r[COL.isbn]);
  const title = (r[COL.title] || "").trim();

  if (!code && !isbn && !rawCategory.trim()) {
    emptyRows++;
    continue;
  }

  const parentName =
    SUBJECT_ALIASES.get(normalizeName(rawCategory)) || rawCategory.trim();
  let parent = groupByName.get(normalizeName(parentName));
  if (!parent) {
    problems.push(`unknown CATEGORY "${rawCategory}" (${title})`);
    continue;
  }

  let child;
  if (!rawSubject.trim()) {
    // Books for School carries no sub-subject in the sheet.
    child = parent.children[0];
    if (!child) {
      problems.push(`no sub-subject for "${title}" in ${parent.name}`);
      continue;
    }
  } else {
    const cleaned =
      SUB_SUBJECT_ALIASES.get(normalizeName(rawSubject)) || rawSubject.trim();
    child =
      childKey.get(
        `${normalizeName(parent.name)}\u0000${normalizeName(cleaned)}`
      ) ||
      // A name that moved parents keeps its single taxonomy home.
      childByName.get(normalizeName(cleaned));
    if (!child) {
      // A sub-subject the menu keeps in another parent: use that parent.
      const homeName = SHELF_HOME.get(normalizeName(cleaned));
      const homeGroup = homeName
        ? groupByName.get(normalizeName(SUBJECT_ALIASES.get(homeName) || homeName))
        : null;
      const homeChild =
        homeGroup && homeName
          ? childKey.get(
              `${normalizeName(homeGroup.name)}\u0000${normalizeName(homeName)}`
            )
          : null;
      if (homeGroup && homeChild) {
        parent = homeGroup;
        child = homeChild;
      }
    }
    if (!child) {
      problems.push(
        `unknown SUBJECT "${rawSubject}" under ${parent.name} (${title})`
      );
      continue;
    }
  }

  if (!code) {
    // 15 Pearson e-books have no stock CODE. `code` is the staging primary key,
    // so give them a deterministic synthetic one and match on ISBN instead.
    if (!isbn) {
      problems.push(`no CODE and no ISBN: ${title}`);
      continue;
    }
    byIsbn.set(isbn, {
      code: `ISBN:${isbn}`,
      isbn,
      title,
      subject: parent.name,
      sub_subject: child.name,
      slug: child.slug,
    });
    shelfCounts.set(child.slug, (shelfCounts.get(child.slug) || 0) + 1);
    continue;
  }

  if (staged.has(code)) continue;
  staged.set(code, {
    code,
    isbn,
    title,
    subject: parent.name,
    sub_subject: child.name,
    slug: child.slug,
  });
  shelfCounts.set(child.slug, (shelfCounts.get(child.slug) || 0) + 1);
}

const records = [...staged.values()];
const byIsbnRecords = [...byIsbn.values()];
const subSubjectCount = taxonomy.reduce((n, g) => n + g.children.length, 0);


/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

fs.mkdirSync(path.join(OUT_DIR, "parts"), { recursive: true });

const csvHeader = ["code", "isbn", "title", "subject", "sub_subject", "slug"];
const csvLines = [csvHeader.join(",")];
for (const r of [...records, ...byIsbnRecords]) {
  csvLines.push(csvHeader.map((k) => csvCell(r[k])).join(","));
}
fs.writeFileSync(
  path.join(OUT_DIR, "subjects_staging.csv"),
  csvLines.join("\n"),
  "utf8"
);

const generated = new Date().toISOString();
/**
 * Staging is a scratch table owned by this import: it is dropped and recreated
 * every run so it always has exactly the columns these parts insert. A plain
 * `create table if not exists` is not enough — an older `stock_staging` (from
 * the stock-update flow) has different columns and no `slug`, and `if not
 * exists` would silently keep it, making every insert fail.
 */
const setup = `-- Subject catalog import — generated ${generated}
-- ${records.length} books matched by CODE, ${byIsbnRecords.length} by ISBN only.
-- Writes ONLY category_id, subject, sub_subject. Stock and price are untouched.

drop table if exists public.stock_staging;

create table public.stock_staging (
  code text primary key,
  isbn text,
  title text,
  subject text not null,
  sub_subject text not null,
  slug text not null
);

-- A previous import may have left rows behind; the table is new, so this is
-- only a safety net if the drop above was skipped.
truncate public.stock_staging;
`;
fs.writeFileSync(path.join(OUT_DIR, "parts", "00_setup.sql"), setup, "utf8");

/* ------------------------------------------------------------------ */
/* 01_categories.sql — the shelves must exist before 99_apply.sql      */
/* ------------------------------------------------------------------ */

/**
 * The storefront resolves a book's shelf through `categories.slug`, so every
 * slug this import writes has to be a real row first. Names match the frontend
 * label (`Parent · Child`) so the shop's filter reads the same as the header.
 */
const shelfRows = taxonomy.flatMap((g) => [
  { slug: g.slug, name: g.name, description: `Browse titles in ${g.name}.` },
  ...g.children.map((c) => ({
    slug: c.slug,
    // Matches the frontend label format (`Parent · Child`).
    name: `${g.name} · ${c.name}`,
    description: `Browse ${c.name} titles in ${g.name}.`,
  })),
]);

const values = shelfRows
  .map(
    (r) =>
      `  (${sqlStr(r.slug)}, ${sqlStr(r.name)}, ${sqlStr(r.description)})`
  )
  .join(",\n");

const categoriesSql = `-- Shelf rows for every subject and sub-subject (run before 99_apply.sql).
-- Idempotent: re-running only refreshes the labels.
insert into public.categories (slug, name, description)
values
${values}
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;

-- Legacy shelves leave the taxonomy: flag them instead of renaming, because
-- categories.name is shown on book cards. Books keep their category_id; the
-- storefront simply stops offering these shelves to browse.
alter table public.categories
  add column if not exists is_active boolean not null default true;

update public.categories
   set is_active = slug = any (array[${shelfRows
     .map((r) => sqlStr(r.slug))
     .join(", ")}]::text[]);
`;
fs.writeFileSync(
  path.join(OUT_DIR, "parts", "01_categories.sql"),
  categoriesSql,
  "utf8"
);

/**
 * Guard against the mistakes that make the Supabase SQL editor fail on import:
 * a stray `;` ends the statement early, and a newline inside a title splits a
 * row and leaves its quote open (which makes Postgres swallow the statements
 * after it). Both are silent in the file, so every part is checked as it is
 * generated.
 */
function validatePartSql(sql, name) {
  const problems = [];
  const lines = sql.split("\n");
  const statements = (sql.match(/;/g) || []).length;
  if (statements !== 1) {
    problems.push(`expected exactly 1 ';' (statement terminator), found ${statements}`);
  }
  const rows = lines.filter((l) => l.startsWith("("));
  if (!rows.length) problems.push("no value rows");
  for (const row of rows) {
    // Last row of a batch has no trailing comma: ")" then the ON CONFLICT block.
    if (!/^\(.*\)[,;]?$/.test(row)) {
      problems.push(`row is not a single-line tuple: ${row.slice(0, 80)}`);
      continue;
    }
    // Count top-level fields, honouring '' escapes.
    const body = row.slice(1, row.lastIndexOf(")"));
    let fields = 1;
    let inQuote = false;
    for (let i = 0; i < body.length; i++) {
      const c = body[i];
      if (c === "'") {
        if (inQuote && body[i + 1] === "'") i++;
        else inQuote = !inQuote;
      } else if (c === "," && !inQuote) fields++;
    }
    if (inQuote) problems.push(`unterminated quote: ${row.slice(0, 80)}`);
    if (fields !== 6) problems.push(`expected 6 fields, got ${fields}: ${row.slice(0, 80)}`);
  }
  if (problems.length) {
    console.error(`\nInvalid SQL in ${name}:`);
    problems.slice(0, 10).forEach((p) => console.error("  -", p));
    throw new Error(`${name} failed validation`);
  }
}

const all = [...records, ...byIsbnRecords];
let part = 0;
for (let i = 0; i < all.length; i += BATCH) {
  part += 1;
  const values = all
    .slice(i, i + BATCH)
    .map(
      (r) =>
        `(${sqlStr(r.code)},${sqlStr(r.isbn)},${sqlStr(r.title)},` +
        `${sqlStr(r.subject)},${sqlStr(r.sub_subject)},${sqlStr(r.slug)})`
    )
    .join(",\n");
  const sql = `-- part ${part} of ${Math.ceil(all.length / BATCH)}
insert into public.stock_staging (code, isbn, title, subject, sub_subject, slug)
values
${values}
on conflict (code) do update set
  isbn = excluded.isbn,
  title = excluded.title,
  subject = excluded.subject,
  sub_subject = excluded.sub_subject,
  slug = excluded.slug;
`;
  const name = `02_insert_part_${String(part).padStart(2, "0")}.sql`;
  validatePartSql(sql, name);
  fs.writeFileSync(path.join(OUT_DIR, "parts", name), sql, "utf8");
}

const apply = `-- Apply the subject catalog (run after 00_setup + every insert part).
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
`;
fs.writeFileSync(path.join(OUT_DIR, "parts", "99_apply.sql"), apply, "utf8");

const readme = `# Subject catalog — ${month}

Generated from \`${path.basename(SRC)}\` on ${generated}.

- Books with CODE: **${records.length}**
- Books matched by ISBN only: **${byIsbnRecords.length}**
- Shelves in use: **${shelfCounts.size}** of ${subSubjectCount}

## Run order
1. \`supabase/migrations/005_subject_taxonomy.sql\` — columns + taxonomy constraints
2. \`parts/00_setup.sql\` — (re)creates the staging table
3. \`parts/01_categories.sql\` — inserts the 108 shelves into \`categories\`
4. \`parts/02_insert_part_01.sql\` … all 35 parts — fills staging
5. \`parts/99_apply.sql\` — sets \`category_id\`, \`subject\`, \`sub_subject\`

Every file is safe to re-run. Stock quantities and prices are **not** modified.
`;
fs.writeFileSync(path.join(OUT_DIR, "README.md"), readme, "utf8");

console.log(`\nWrote ${path.relative(ROOT, OUT_DIR)}`);
console.log(`  subjects_staging.csv (${csvLines.length - 1} rows)`);
console.log(`  parts/00_setup.sql + ${part} insert part(s) + parts/99_apply.sql`);

console.log(
  `taxonomy: ${taxonomy.length} subjects, ${subSubjectCount} sub-subjects`
);
console.log(`source rows: ${rows.length} (empty: ${emptyRows})`);
console.log(
  `books with CODE: ${records.length}, by ISBN only: ${byIsbnRecords.length}`
);
console.log(`unresolved rows: ${problems.length}`);

if (problems.length) {
  const unique = [...new Set(problems)];
  console.log(`\nUnresolved rows: ${unique.length}`);
  unique.slice(0, 40).forEach((p) => console.log(" -", p));
  console.error(
    "\nFix the taxonomy in frontend/src/lib/data/subjects.ts (or add an alias) " +
      "so every book has a shelf."
  );
  process.exit(1);
}

const emptyShelves = taxonomy
  .flatMap((g) => g.children)
  .filter((c) => !shelfCounts.has(c.slug));
console.log(`\nshelves in use: ${shelfCounts.size}`);
if (emptyShelves.length) {
  console.log(
    `empty shelves (no stock yet): ${emptyShelves.map((c) => c.name).join(", ")}`
  );
}

// A sub-subject name that appears under two parents would send books from both
// parents to the same shelf, so the per-parent slug could never resolve.
const byName = new Map();
for (const g of taxonomy) {
  for (const c of g.children) {
    const key = normalizeName(c.name);
    byName.set(key, [...(byName.get(key) || []), `${g.name} > ${c.name}`]);
  }
}
const clash = [...byName.entries()]
  .filter(([, list]) => list.length > 1)
  .map(([name, list]) => `${name}: ${list.join(" / ")}`);
if (clash.length) {
  console.error(
    "\nSame sub-subject name under more than one subject (they share one shelf):\n" +
      clash.join("\n")
  );
  process.exit(1);
}

if (flag("--check-sql")) {
  // Migrations 005 + the storefront categories come from this taxonomy, so a
  // name added to subjects.ts without updating them would silently reject books.
  const sql = fs.readFileSync(MIGRATION_FILE, "utf8");
  const readSqlList = (marker) => {
    const from = sql.indexOf(marker);
    const to = sql.indexOf("]::text[];", from);
    if (from < 0 || to < 0) throw new Error(`Could not read ${marker}`);
    return [...sql.slice(from, to).matchAll(/'([^']+)'/g)].map((m) => m[1]);
  };
  const sqlGroups = new Set(readSqlList("allied_subject_names()"));
  const sqlChildren = new Set(readSqlList("allied_sub_subject_names()"));
  const tsGroups = taxonomy.map((g) => g.name);
  const tsChildren = taxonomy.flatMap((g) => g.children.map((c) => c.name));
  const missing = [
    ...tsGroups.filter((n) => !sqlGroups.has(n)),
    ...tsChildren.filter((n) => !sqlChildren.has(n)),
  ];
  const extra = [
    ...[...sqlGroups].filter((n) => !tsGroups.includes(n)),
    ...[...sqlChildren].filter((n) => !tsChildren.includes(n)),
  ];
  if (missing.length || extra.length) {
    console.error(
      `\nsubjects.ts and ${path.basename(MIGRATION_FILE)} disagree.` +
        (missing.length ? `\n  missing in SQL: ${missing.join(", ")}` : "") +
        (extra.length ? `\n  only in SQL: ${extra.join(", ")}` : "")
    );
    process.exit(1);
  }
  console.log(`\nSQL taxonomy is in sync (${tsGroups.length} subjects, ${tsChildren.length} sub-subjects).`);
}


if (CHECK_ONLY) {
  console.log("\n--check: taxonomy resolves every row; nothing written.");
  return;
}
