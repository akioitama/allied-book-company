/**
 * Split 01_apply_stock_update.sql into SQL-Editor-sized chunks.
 * Run all parts in the SAME Supabase SQL Editor tab (temp table is session-scoped).
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "supabase", "stock-update-2026-09");
const SRC = path.join(DIR, "01_apply_stock_update.sql");
const OUT = path.join(DIR, "parts");

fs.mkdirSync(OUT, { recursive: true });

// Clear old parts
for (const f of fs.readdirSync(OUT)) {
  if (f.endsWith(".sql") || f === "README.md") {
    fs.unlinkSync(path.join(OUT, f));
  }
}

const text = fs.readFileSync(SRC, "utf8");

const insertStart = text.indexOf("INSERT INTO stock_staging (");
const updateStart = text.indexOf("-- 1) Match by stock CODE");

if (insertStart < 0 || updateStart < 0) {
  throw new Error("Could not locate INSERT / UPDATE sections");
}

let setup = text.slice(0, insertStart);
// Don't hold an open transaction across multiple editor runs
setup = setup.replace(/\r?\nBEGIN;\r?\n/, "\n");
setup = setup.trimEnd() + "\n";

const insertsBlock = text.slice(insertStart, updateStart).trim();
let apply = text.slice(updateStart).trim();
// Keep COMMIT only if BEGIN exists; otherwise drop orphan COMMIT
if (!apply.includes("BEGIN;")) {
  apply = apply.replace(/\r?\nCOMMIT;\r?\n/, "\n");
}
apply =
  "-- PART: apply updates + verification\n" +
  "-- Run AFTER all insert parts, in the SAME SQL Editor session.\n\n" +
  apply +
  "\n";

// Split into individual INSERT statements
const insertStatements = insertsBlock
  .split(/(?=INSERT INTO stock_staging \()/g)
  .map((s) => s.trim())
  .filter(Boolean);

console.log("INSERT statements:", insertStatements.length);

// ~4 INSERT batches per file (~800 rows) keeps each file under editor limits
const INSERTS_PER_FILE = 4;
const insertFiles = [];
for (let i = 0; i < insertStatements.length; i += INSERTS_PER_FILE) {
  const chunk = insertStatements.slice(i, i + INSERTS_PER_FILE);
  const partNum = String(Math.floor(i / INSERTS_PER_FILE) + 1).padStart(2, "0");
  const name = `02_insert_part_${partNum}.sql`;
  const body =
    `-- PART: insert ${partNum} of ${Math.ceil(insertStatements.length / INSERTS_PER_FILE)}\n` +
    `-- Run in the SAME SQL Editor session after 00_setup.sql\n` +
    `-- Statements in this file: ${chunk.length}\n\n` +
    chunk.join("\n\n") +
    "\n";
  fs.writeFileSync(path.join(OUT, name), body, "utf8");
  insertFiles.push(name);
  console.log(
    name,
    "bytes",
    fs.statSync(path.join(OUT, name)).size,
    "inserts",
    chunk.length
  );
}

fs.writeFileSync(
  path.join(OUT, "00_setup.sql"),
  `-- PART 0: setup\n` +
    `-- Run FIRST in a fresh SQL Editor tab. Keep that tab open for all later parts.\n\n` +
    setup,
  "utf8"
);

fs.writeFileSync(path.join(OUT, "99_apply_updates.sql"), apply, "utf8");

const readme = `# Stock update — split parts (SQL Editor safe)

The full \`01_apply_stock_update.sql\` is too large for Supabase SQL Editor.
Use these parts instead.

## Critical
Run **all parts in the same SQL Editor tab/session**.
\`stock_staging\` is a **TEMP** table — closing the tab clears it.

## Order
1. \`00_setup.sql\` — ALTERs + CREATE TEMP TABLE
2. \`02_insert_part_01.sql\` … \`02_insert_part_${String(insertFiles.length).padStart(2, "0")}.sql\` — load staging rows
3. \`99_apply_updates.sql\` — UPDATE books + verification SELECT

## Checklist
${["00_setup.sql", ...insertFiles, "99_apply_updates.sql"]
  .map((f, i) => `${i + 1}. [ ] ${f}`)
  .join("\n")}

## If an INSERT part fails
Re-run that part only (same session). Then continue with the next part.
Do **not** re-run \`00_setup.sql\` mid-way unless you want to wipe staging (\`TRUNCATE\` is in setup).
`;

fs.writeFileSync(path.join(OUT, "README.md"), readme, "utf8");

console.log("Wrote setup +", insertFiles.length, "insert parts + apply →", OUT);
