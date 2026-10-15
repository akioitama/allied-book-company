"""Assign every book a category based on reliable title metadata.

Root problem this fixes: all 7,322 books had category_id = NULL, so the shop's
category filter matched nothing and every shelf showed the whole catalog.

Approach (deterministic, reviewable, no external API dependency):
1. Ensure the full category taxonomy exists in the DB (source of truth),
   reconciling slugs with the frontend nav.
2. Classify each book by matching an ordered set of keyword rules against its
   title. Rules are ordered most-specific -> most-generic; first match wins.
3. Write category_id back in batches. Unmatched books stay NULL (shown only
   under "All shelves"), never mis-shelved.

Usage:
  python scripts/categorize_books.py --dry     # classify + print distribution
  python scripts/categorize_books.py --apply   # also write category_id
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
from collections import Counter
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / "backend" / ".env"


def load_env() -> None:
    if not ENV.exists():
        return
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


# Canonical taxonomy (name, slug) — matches the frontend nav slugs.
TAXONOMY: list[tuple[str, str]] = [
    ("Adult Colouring Books", "adult-colouring-books"),
    ("Agriculture", "agriculture"),
    ("Anthropology", "anthropology"),
    ("Antiques & Collectibles", "antiques-and-collectibles"),
    ("Archaeology", "archaeology"),
    ("Architecture", "architecture"),
    ("Art", "art"),
    ("Automobiles", "automobiles"),
    ("Aviation", "aviation"),
    ("Bio & Autobiography", "bio-and-autobiography"),
    ("Body, Mind & Spirit", "body-mind-and-spirit"),
    ("Business", "business"),
    ("Children", "children"),
    ("Classics", "classics"),
    ("Collector's Editions", "collectors-editions"),
    ("Computer", "computer"),
    ("Cooking", "cooking"),
    ("Crafts", "crafts"),
    ("Economics", "economics"),
    ("Education", "education"),
    ("Engineering", "engineering"),
    ("English Literature", "english-literature"),
    ("Fashion", "fashion"),
    ("Fiction", "fiction"),
    ("Gardening & Landscaping", "gardening-and-landscaping"),
    ("Graphic Novels & Manga", "graphic-novels-and-manga"),
    ("Health & Fitness", "health-and-fitness"),
    ("History", "history"),
    ("Home & Interior", "home-and-interior"),
    ("Humour", "humour"),
    ("Language", "language"),
    ("Law", "law"),
    ("Library & Information Science", "library-information-science"),
    ("Linguistics", "linguistics"),
    ("Literary Criticism", "literary-criticism"),
    ("Literature", "literature"),
    ("Mass Communication", "mass-communication"),
    ("Mathematics", "mathematics"),
    ("Medical", "medical"),
    ("Middle Eastern Studies", "middle-eastern-studies"),
    ("Music", "music"),
    ("Nature", "nature"),
    ("Nursing", "nursing"),
    ("Pakistan Studies", "pakistan-studies"),
    ("Performing Arts", "performing-arts"),
    ("Pets", "pets"),
    ("Philosophy", "philosophy"),
    ("Photography", "photography"),
    ("Poetry", "poetry"),
    ("Politics", "politics"),
    ("Psychology", "psychology"),
    ("Reference", "reference"),
    ("Religion", "religion"),
    ("Science", "science"),
    ("Self Help", "self-help"),
    ("Sports & Recreation", "sports-and-recreation"),
    ("Technology", "technology"),
    ("Urdu Literature", "urdu-literature"),
    ("Veterinary", "veterinary"),
]


def kw(*words: str) -> re.Pattern:
    """Whole-word (mostly) case-insensitive alternation."""
    parts = [w if w.startswith("\\b") else re.escape(w) for w in words]
    return re.compile("|".join(parts), re.I)


# Ordered rules: (slug, pattern). First match wins, so keep specific first.
RULES: list[tuple[str, re.Pattern]] = [
    # --- Regional / studies (specific) ---
    ("urdu-literature", kw("(urdu)", "urdu")),
    ("pakistan-studies", kw(
        "pakistan", "jinnah", "kashmir", "afghan", "punjab", "sindh",
        "balochistan", "mujahidin", "chitral", "partition of india",
    )),
    ("middle-eastern-studies", kw(
        "arab world", "middle east", "islamic world", "muslim world",
        "ottoman", "persian", "iran's", "iranian",
    )),
    # --- Medicine / health cluster (very specific, catalog-heavy) ---
    ("nursing", kw("nursing", "nurse", "nbde")),
    ("veterinary", kw(
        "veterinary", "avian medicine", "animal husbandry", "fish parasites",
        "poultry",
    )),
    ("medical", kw(
        "surgery", "surgical", "pathology", "pediatric", "paediatric",
        "obstetric", "gynaec", "gynecolog", "cardiolog", "cardiovascular",
        "neurolog", "neurosurg", "neuroanatomy", "orthopaed", "orthopedic",
        "dermatolog", "radiolog", "ultrasound", "anaesth", "anesth",
        "ophthalmolog", "urolog", "hematolog", "haematolog", "oncolog",
        "pharmacolog", "pharmacy", "pharmaco", "clinical", "diagnosis",
        "disease", "therapy", "physiotherapy", "epidemiolog", "biostatistic",
        "histolog", "physiolog", "anatomy", "dental", "dentistry",
        "biochemistry for", "nelson textbook", "robbins", "internal medicine",
        "public health", "healthcare", "health assessment", "immunolog",
        "microbiolog", "endocrin", "gastro", "nephrolog", "pulmonary",
        "psychopatholog", "biopharmaceutical", "medicine", "surgeon",
        "temporomandibular", "stroke", "biomedical", "critical care",
    )),
    ("health-and-fitness", kw(
        "fitness", "exercise physiolog", "nutrition", "diet", "yoga",
        "wellness", "weight loss",
    )),
    # --- Computing / technology / engineering ---
    ("computer", kw(
        "programming", "software", "javascript", "python", "java ",
        "nestjs", "graphql", "microservices", "machine learning",
        "deep learning", "data structures", "algorithms", "computer network",
        "cryptography", "network security", "cyber", "database", "sql",
        "operating system", "verilog", "hdl", "computer vision", "rfid",
        "artificial intelligence", "\\bai\\b", "data analytics",
        "data analysis", "data science", "computing", "computer performance",
    )),
    ("engineering", kw(
        "engineering", "electrodynamics", "electromagnet", "power system",
        "power electronics", "converters", "instrumentation", "tribology",
        "circuit", "verilog", "signal", "wavelet", "control system",
        "mechanics", "thermodynamic", "fluid", "hydraulic", "structural",
        "manufacturing", "materials", "composite material", "textile eng",
        "optical fibre", "fiber optic", "nanoengineering", "astrophotonics",
        "petroleum", "flow assurance", "geotechnical", "geomechanics",
        "ac power", "electrical",
    )),
    ("technology", kw(
        "3d printing", "3d modeling", "sketchup", "biometric",
        "nanotechnolog", "robotics", "gis", "geographic information",
    )),
    ("mathematics", kw(
        "mathematic", "linear algebra", "abstract algebra", "calculus",
        "numerical", "statistical methods", "statistics", "probability",
        "regression", "topolog", "geometry", "complex analysis",
        "complex variables", "complex function",
    )),
    # --- Applied sciences ---
    ("agriculture", kw(
        "agricultur", "soil", "crop", "plant genome", "horticultur",
        "land and soil", "compost", "feed evaluation", "plant-microbe",
    )),
    ("science", kw(
        "physics", "chemistry", "chemical", "biology", "biolog", "genetic",
        "genome", "molecular", "botany", "zoolog", "ecolog", "ecosystem",
        "astrophysics", "astronom", "geolog", "environmental", "virology",
        "virus", "protein", "biochemistry", "quantum", "particle physics",
        "magnetism", "electromagnetic field", "invertebrate", "chordate",
        "reproductive biology", "field guide", "science",
    )),
    # --- Business / economics / law / education ---
    ("economics", kw(
        "economic", "economy", "macroeconom", "microeconom", "global trade",
        "financial forecasting", "development economics",
    )),
    ("business", kw(
        "business", "management", "marketing", "strategy", "leadership",
        "accounting", "finance", "financial", "valuation", "investment",
        "entrepreneur", "customer", "brand", "project management",
        "supply chain", "organization", "organisational", "hospitality",
        "tourism marketing", "performance measurement", "grant writer",
    )),
    ("law", kw(
        "\\blaw\\b", "laws", "legal", "mortgage", "constitution",
        "jurisprudence", "criminal", "contract law",
    )),
    ("library-information-science", kw(
        "library", "librarian", "libraries", "makerspace", "koha",
        "information science", "reference today",
    )),
    ("education", kw(
        "teaching", "pedagog", "curriculum", "education", "educator",
        "classroom", "learning outcome", "student-athlete", "edd ",
    )),
    ("mass-communication", kw(
        "media psychology", "mass communication", "public communication",
        "journalism", "public relations", "communication research",
    )),
    # --- Arts & design ---
    ("architecture", kw(
        "architect", "architecture", "building construction", "building skin",
        "vernacular architecture", "climate responsive",
    )),
    ("fashion", kw(
        "fashion", "patternmaking", "tailoring", "menswear", "womenswear",
        "garment", "sewing",
    )),
    ("photography", kw("photograph", "photography")),
    ("performing-arts", kw(
        "theatre", "theater", "drama", "performing", "cinema", "film",
        "dance", "opera",
    )),
    ("music", kw("music", "jazz", "symphony", "peer gynt")),
    ("crafts", kw(
        "needlepoint", "embroidery", "knitting", "crochet", "quilt",
        "crafts", "tapestry", "textile printing",
    )),
    ("art", kw(
        "\\bart\\b", "painting", "paintings", "impressionist", "sculpture",
        "drawing", "abstract art", "masterpieces", "jewelry", "jewellery",
    )),
    ("home-and-interior", kw(
        "interior", "furnishing", "home decor", "interiors for living",
    )),
    ("cooking", kw("cook", "cooking", "recipe", "cuisine", "baking", "food safety")),
    ("gardening-and-landscaping", kw("gardening", "landscaping", "landscape")),
    ("pets", kw("\\bpets\\b", "dog training", "cat care")),
    ("nature", kw(
        "nature", "wildlife", "birds", "animal atlas", "habitats of the world",
        "water our", "climate",
    )),
    ("automobiles", kw("automobile", "\\bcar\\b", "motor vehicle")),
    ("aviation", kw("aviation", "aircraft", "aeronautic")),
    ("sports-and-recreation", kw(
        "sport", "sports", "ethics in sport", "games", "recreation",
        "athletic",
    )),
    # --- Humanities / social sciences ---
    ("psychology", kw(
        "psycholog", "psychodynamic", "counselling", "counseling",
        "cognitive", "behaviour", "behavior",
    )),
    ("anthropology", kw("anthropolog", "ethnograph")),
    ("linguistics", kw("linguistic", "phonolog", "syntax", "semantics")),
    ("language", kw(
        "arabic", "english spelling", "language testing", "grammar",
        "dictionary of", "learn ", "spelling",
    )),
    ("religion", kw(
        "islam", "islamic", "quran", "qur'an", "hadith", "ibadah", "salah",
        "sawm", "muhammad", "prophet", "theology", "religion", "religious",
        "sufi", "worship", "barth", "judgement day", "bible", "christian",
        "hindu", "buddhis",
    )),
    ("philosophy", kw(
        "philosoph", "ethics", "metaphysic", "epistemolog", "logic",
        "aristotle", "plato", "gender trouble", "existential",
    )),
    ("politics", kw(
        "politic", "geopolit", "grand strategy", "statecraft", "governance",
        "public policy", "public administration", "policy analysis",
        "democracy", "diplomacy", "international relations", "welfare state",
        "belt and road", "military supremacy", "national",
    )),
    ("history", kw(
        "history", "historical", "a life from beginning to end", "conqueror",
        "empire", "civilization", "civilisation", "ancient", "medieval",
        "war ", "creation of pakistan",
    )),
    ("bio-and-autobiography", kw(
        "biography", "autobiography", "memoir", "my journey", "a life",
        "his character and conduct",
    )),
    ("literary-criticism", kw(
        "norton critical", "critical edition", "companion to", "bloomsbury handbook",
        "cambridge companion", "literary criticism", "literary theory",
    )),
    # --- Literature / fiction / poetry (generic; keep late) ---
    ("poetry", kw("poem", "poems", "poetry", "anthology of poetry", "selected poems")),
    ("english-literature", kw(
        "norton anthology", "english literature", "shakespeare", "chaucer",
        "doctor faustus", "gulliver", "joseph andrews", "cummings",
    )),
    ("children", kw(
        "children", "usborne", "for beginners", "illustrated atlas",
        "things to know about", "children's",
    )),
    ("graphic-novels-and-manga", kw("manga", "graphic novel", "comic")),
    ("classics", kw("classic", "classics")),
    ("reference", kw(
        "encyclopedia", "encyclopaedia", "handbook", "dictionary",
        "thesaurus", "atlas", "manual of", "guide to", "webster",
    )),
    ("fiction", kw("a novel", "novel", "stories", "short story", "tales")),
    ("literature", kw("literature", "essays", "prose")),
    ("self-help", kw(
        "self-help", "productivity", "habits", "how to make", "success",
        "mindset", "zen to done", "reflections of a man",
    )),
]


def classify(title: str) -> str | None:
    t = title or ""
    for slug, pattern in RULES:
        if pattern.search(t):
            return slug
    return None


async def ensure_taxonomy(
    client: httpx.AsyncClient, base: str, headers: dict
) -> dict[str, str]:
    res = await client.get(
        f"{base}/rest/v1/categories?select=id,slug,name", headers=headers
    )
    res.raise_for_status()
    existing = res.json()
    by_name = {c["name"].strip().lower(): c for c in existing}
    by_slug = {c["slug"]: c for c in existing}

    jheaders = {**headers, "Content-Type": "application/json"}
    for name, slug in TAXONOMY:
        row = by_name.get(name.strip().lower())
        if row:
            if row["slug"] != slug:
                await client.patch(
                    f"{base}/rest/v1/categories",
                    params={"id": f"eq.{row['id']}"},
                    headers={**jheaders, "Prefer": "return=minimal"},
                    json={"slug": slug},
                )
                print(f"  reslug {row['slug']} -> {slug}", flush=True)
            continue
        if slug in by_slug:
            continue
        await client.post(
            f"{base}/rest/v1/categories",
            headers={**jheaders, "Prefer": "return=minimal"},
            json={"slug": slug, "name": name},
        )
        print(f"  + category {slug}", flush=True)

    res = await client.get(
        f"{base}/rest/v1/categories?select=id,slug", headers=headers
    )
    res.raise_for_status()
    return {c["slug"]: c["id"] for c in res.json()}


async def main_async(apply: bool) -> None:
    load_env()
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base or not key:
        raise SystemExit("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}

    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        slug_to_id = await ensure_taxonomy(client, base, headers)

        # Load every book (id + title).
        books: list[dict] = []
        offset = 0
        while True:
            res = await client.get(
                f"{base}/rest/v1/books",
                params={
                    "select": "id,title",
                    "order": "id",
                    "limit": "1000",
                    "offset": str(offset),
                },
                headers=headers,
            )
            res.raise_for_status()
            rows = res.json()
            books.extend(rows)
            if len(rows) < 1000:
                break
            offset += len(rows)

        dist = Counter()
        assignments: list[tuple[str, str]] = []  # (book_id, category_id)
        for b in books:
            slug = classify(b.get("title") or "")
            dist[slug or "(uncategorized)"] += 1
            if slug and slug in slug_to_id:
                assignments.append((b["id"], slug_to_id[slug]))

        total = len(books)
        matched = sum(v for k, v in dist.items() if k != "(uncategorized)")
        print(f"\nBooks: {total}  matched: {matched}  "
              f"uncategorized: {dist['(uncategorized)']}", flush=True)
        print("Top categories:", flush=True)
        for slug, n in dist.most_common(20):
            print(f"  {slug:32s} {n}", flush=True)

        if not apply:
            print("\nDry run — pass --apply to write category_id.", flush=True)
            return

        jheaders = {
            **headers,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        sem = asyncio.Semaphore(10)
        done = 0

        async def write(book_id: str, cat_id: str) -> None:
            nonlocal done
            async with sem:
                res = await client.patch(
                    f"{base}/rest/v1/books",
                    params={"id": f"eq.{book_id}"},
                    headers=jheaders,
                    json={"category_id": cat_id},
                )
                if res.status_code < 400:
                    done += 1
                    if done % 500 == 0:
                        print(f"  wrote {done}/{len(assignments)}", flush=True)

        await asyncio.gather(*[write(bid, cid) for bid, cid in assignments])
        print(f"\nDone. category_id set on {done} books.", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--dry", action="store_true")
    args = parser.parse_args()
    asyncio.run(main_async(apply=args.apply and not args.dry))


if __name__ == "__main__":
    main()
