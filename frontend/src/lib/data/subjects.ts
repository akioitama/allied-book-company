/**
 * Client subject taxonomy (subject → sub-subjects).
 * Source: AMMAR 1234.xlsx — only these subjects appear in Subjects nav.
 */

export type SubSubject = {
  name: string;
  slug: string;
  /** Optional shop category slug when it maps 1:1 to the DB. */
  categorySlug?: string;
};

export type SubjectGroup = {
  name: string;
  slug: string;
  /** Primary DB category for “browse all in this subject”. */
  categorySlug?: string;
  children: SubSubject[];
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[/+,]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sub(
  name: string,
  categorySlug?: string
): SubSubject {
  return { name, slug: slugify(name), categorySlug };
}

/**
 * Hierarchy from the client spreadsheet.
 * Display names cleaned lightly for typos; structure matches the sheet.
 */
export const SUBJECT_GROUPS: SubjectGroup[] = [
  {
    name: "Medicine & Healthcare",
    slug: "medicine-and-healthcare",
    categorySlug: "medical",
    children: [
      sub("Anatomy"),
      sub("Anesthesia"),
      sub("Biochemistry"),
      sub("Cancer"),
      sub("Cardiac Surgery"),
      sub("Cardiology"),
      sub("Community Medicine"),
      sub("Dentistry"),
      sub("Dermatology"),
      sub("ENT"),
      sub("Forensic Medicine"),
      sub("Gastroenterology"),
      sub("Gyn & Obs"),
      sub("Hematology"),
      sub("Medical Education"),
      sub("Medical Lab Technology"),
      sub("Medicine"),
      sub("Microbiology & Genetics"),
      sub("Neurology & Neurosurgery"),
      sub("Nursing", "nursing"),
      sub("Ophthalmology"),
      sub("Orthopedics"),
      sub("Pathology"),
      sub("Pediatric Surgery"),
      sub("Pediatrics"),
      sub("Pharmacology"),
      sub("Pharmacy"),
      sub("Physiology"),
      sub("Physiotherapy"),
      sub("Plastic Surgery"),
      sub("Psychiatry"),
      sub("Radiology"),
      sub("Respiratory Diseases"),
      sub("Surgery"),
      sub("Urology & Nephrology"),
    ],
  },
  {
    name: "Business & Management Sciences",
    slug: "business-and-management-sciences",
    categorySlug: "business",
    children: [
      sub("Accounting"),
      sub("Administrative Science"),
      sub("Banking & Finance"),
      sub("Business Studies"),
      sub("Marketing"),
      sub("Management Sciences"),
      sub("Tourism & Hotel Management"),
    ],
  },
  {
    name: "Social Sciences",
    slug: "social-sciences",
    children: [
      sub("Economics", "economics"),
      sub("Education", "education"),
      sub("English Language", "language"),
      sub("English Literature", "english-literature"),
      sub("Fine Art", "art"),
      sub("Gender Studies"),
      sub("Geography"),
      sub("History", "history"),
      sub("Home Economics"),
      sub("Islamic Studies", "religion"),
      sub("Law", "law"),
      sub("Library Science", "library-information-science"),
      sub("Media Studies", "mass-communication"),
      sub("Pakistan Studies", "pakistan-studies"),
      sub("Philosophy", "philosophy"),
      sub("Physical Education", "sports-and-recreation"),
      sub("Political Science & IR", "politics"),
      sub("Psychology", "psychology"),
      sub("Research Methodology"),
      sub("Sociology & Social Work"),
      sub("Special Education"),
      sub("Reference", "reference"),
      sub("Textile & Fashion Design", "fashion"),
    ],
  },
  {
    name: "Science & Technology",
    slug: "science-and-technology",
    categorySlug: "science",
    children: [
      sub("Agriculture", "agriculture"),
      sub("Artificial Intelligence"),
      sub("Chemistry"),
      sub("Biotechnology"),
      sub("Botany"),
      sub("Computer Science", "computer"),
      sub("Cyber Security"),
      sub("Data Science"),
      sub("Electronics"),
      sub("Environment"),
      sub("Fishery"),
      sub("Food & Nutrition"),
      sub("Mathematics", "mathematics"),
      sub("Microbiology & Genetics"),
      sub("Physics"),
      sub("Software Engineering"),
      sub("Statistics"),
      sub("Veterinary Science", "veterinary"),
      sub("Zoology / Biology"),
    ],
  },
  {
    name: "Engineering",
    slug: "engineering",
    categorySlug: "engineering",
    children: [
      sub("Architecture", "architecture"),
      sub("Biomedical Engineering"),
      sub("Chemical Engineering"),
      sub("Civil Engineering"),
      sub("Electrical Engineering"),
      sub("Electronics"),
      sub("Energy"),
      sub("Fine Art", "art"),
      sub("Geology"),
      sub("Industrial Engineering"),
      sub("Mechanical Engineering"),
      sub("Mechatronics & Control Engineering"),
      sub("Metallurgy & Material Science"),
      sub("Petroleum Engineering"),
      sub("Telecommunication Engineering"),
      sub("Textile & Fashion", "fashion"),
      sub("Transportation Engineering"),
      sub("Urban Planning"),
      sub("Water"),
    ],
  },
  {
    name: "Books for School",
    slug: "books-for-school",
    categorySlug: "children",
    children: [],
  },
  {
    name: "Urdu Literature",
    slug: "urdu-literature",
    categorySlug: "urdu-literature",
    children: [],
  },
];

/** Build shop URL for a parent subject. */
export function subjectHref(group: SubjectGroup): string {
  if (group.categorySlug) {
    return `/shop?category=${encodeURIComponent(group.categorySlug)}`;
  }
  return `/shop?q=${encodeURIComponent(group.name)}`;
}

/** Build shop URL for a sub-subject (prefer category, else search within parent). */
export function subSubjectHref(
  group: SubjectGroup,
  child: SubSubject
): string {
  const params = new URLSearchParams();
  if (child.categorySlug) {
    params.set("category", child.categorySlug);
  } else if (group.categorySlug) {
    params.set("category", group.categorySlug);
    params.set("q", child.name);
  } else {
    params.set("q", child.name);
  }
  return `/shop?${params.toString()}`;
}
