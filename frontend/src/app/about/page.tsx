import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "About Us" };

const LAHORE_MAPS_URL =
  "https://www.google.com/maps/dir//Allied+Book+Company,+Naqi+Market,+75+Shahrah-e-Quaid-e-Azam,+Mozang+Chungi,+Lahore,+54000/data=!4m6!4m5!1m1!4e2!1m2!1m1!1s0x391904ad34c0f1cf:0x9075cbabf1281693?sa=X&ved=1t:57443&ictx=111";

const STATS = [
  { value: "1984", label: "Established" },
  { value: "10,000+", label: "Titles in stock" },
  { value: "40+", label: "Years of service" },
  { value: "Global", label: "Publisher network" },
] as const;

/** Primary storefront — secondary gallery slots for more photos. */
const MAIN_STOREFRONT = {
  src: "/storefront-main.jpg",
  alt: "Allied Book Co. storefront at Naqi Market, 75-The Mall, Lahore",
};

const SECONDARY_STOREFRONTS: { src: string; alt: string }[] = [
  {
    src: "/storefront-2.jpg",
    alt: "Allied Book Co. reading room with Accounting, Business, Law, and Computer shelves",
  },
  {
    src: "/storefront-3.jpg",
    alt: "Allied Book Co. interior with bookshelves, desk, and waiting area",
  },
  {
    src: "/storefront-4.jpg",
    alt: "Allied Book Co. aisle lined with bookshelves leading to the upper level",
  },
];

const OFFICE_CONTACTS = [
  {
    role: "Manager",
    name: "Mr. Nasrullah",
  },
  {
    role: "For General Inquiries",
    name: "Muhammad Ameen",
  },
  {
    role: "For General Inquiries",
    name: "Mr. Adeel",
  },
  {
    role: "Journal / Magazine · Psychological Tests & Tools",
    name: "Mr. Irfan Javed",
  },
] as const;

type TeamMember = {
  name: string;
  role: string;
  photo?: string;
  initials: string;
};

/** Lahore head office — row 1 leads, then two rows of four. */
const MAIN_TEAM_ROWS: TeamMember[][] = [
  [
    {
      name: "Mr. Nasrullah",
      role: "Managing Director",
      photo: "/team/nasrullah.jpg",
      initials: "MN",
    },
    {
      name: "Ammar NasrUllah",
      role: "Online Trade Manager",
      photo: "/team/ammar-nasrullah.jpg",
      initials: "AN",
    },
  ],
  [
    {
      name: "Khalid Ali",
      role: "Operations Manager",
      photo: "/team/khalid-ali.jpg",
      initials: "KA",
    },
    {
      name: "Zia Ullah",
      role: "Sales Manager",
      photo: "/team/zia-ullah.jpg",
      initials: "ZU",
    },
    {
      name: "Atif Ishfaq",
      role: "Sales Executive",
      photo: "/team/atif-ishfaq.jpg",
      initials: "AI",
    },
    {
      name: "Khalid Javed",
      role: "Sales Executive",
      photo: "/team/khalid-javed.jpg",
      initials: "KJ",
    },
  ],
  [
    {
      name: "Maqsood Aziz",
      role: "Imports",
      photo: "/team/maqsood-aziz.jpg",
      initials: "MA",
    },
    {
      name: "Ali Raza",
      role: "Subscription",
      photo: "/team/ali-raza.jpg",
      initials: "AR",
    },
    {
      name: "Fayyaz Mughal",
      role: "Accounts",
      photo: "/team/fayyaz-mughal.jpg",
      initials: "FM",
    },
    {
      name: "Muhammad Ameen",
      role: "Customer Care",
      photo: "/team/muhammad-ameen.jpg",
      initials: "MA",
    },
  ],
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden pt-[10.75rem] text-white md:pt-[9.5rem]"
        style={{
          background:
            "linear-gradient(150deg, #0F172A 0%, #1E3A8A 45%, #2563EB 100%)",
        }}
      >
        <div className="absolute inset-0 bg-map-grid bg-map-grid opacity-[0.07]" />
        <div className="absolute -right-24 top-12 h-72 w-72 rounded-full bg-[#93C5FD]/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#1E3A8A]/40 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 text-center md:px-8 md:pb-20 md:pt-20">
          <div className="-translate-y-[calc(3.5rem-64px)] md:-translate-y-[calc(5rem-64px)]">
            <div className="mx-auto inline-flex rounded-full bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
              <Image
                src="/logo.png"
                alt="Allied Book Co."
                width={96}
                height={88}
                className="h-16 w-auto md:h-20"
                priority
              />
            </div>
            <h1 className="mt-8 font-display text-5xl leading-[1.02] tracking-tight md:text-7xl lg:text-8xl">
              Allied Book{" "}
              <span className="italic text-[#93C5FD]">Co.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl font-body text-lg leading-relaxed text-white/85 md:text-xl">
              The Knowledge Provider — serving higher education institutions and
              individual scholars with quality books and reading material across
              Pakistan.
            </p>

            <dl className="mt-10 grid grid-cols-2 gap-4 md:mt-12 md:grid-cols-4 md:gap-6">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="border border-white/15 bg-white/10 px-5 py-5 text-center backdrop-blur-sm md:px-6 md:py-6"
                >
                  <dt className="font-display text-3xl text-white md:text-4xl">
                    {stat.value}
                  </dt>
                  <dd className="mt-1 font-label text-[0.62rem] uppercase tracking-[0.18em] text-white/70">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* About us */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-3xl">
          <p className="eyebrow">About Us</p>
          <h2 className="mt-3 font-display text-4xl text-ink md:text-5xl text-balance">
            Four decades of{" "}
            <em className="text-[#2563EB]">trusted bookselling</em>
          </h2>
          <div className="mt-8 space-y-5 font-body text-lg leading-relaxed text-ink-soft">
            <p>
              By the grace of Almighty Allah, Allied Book Co. started its
              journey on 1st March 1984.
            </p>
            <p>
              The main Objective of the company has been to contribute in
              Nations development by providing personalize service to Higher
              Education Institutions and individual scholars with quality
              Books and reading material in most of the medium. Within the
              span of nearly three decades, the organization has emerged as
              one of the leading professional Booksellers of the country.
            </p>
            <p>
              The company has also earned excellent reputation amongst
              world&apos;s leading academic publishers; hence, we have been
              assigned exclusive distribution of best selling international
              products For Pakistan.
            </p>
          </div>
        </div>
      </section>

      {/* Visit & contact — Lahore */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">Visit us</p>
          <h2 className="mt-3 font-display text-4xl text-ink md:text-5xl text-balance">
            Our Lahore{" "}
            <em className="text-[#2563EB]">storefront</em>
          </h2>
          <p className="mt-4 font-body text-lg leading-relaxed text-ink-soft">
            Allied Book Co. · Naqi Market, The Mall. Email, call, or ask for the
            desk that matches your inquiry.
          </p>
        </div>

        <figure className="relative mt-10 overflow-hidden border border-brass/40 shadow-ambient">
          <div className="relative aspect-[16/10] w-full sm:aspect-[21/10]">
            <Image
              src={MAIN_STOREFRONT.src}
              alt={MAIN_STOREFRONT.alt}
              fill
              priority
              sizes="(max-width: 1152px) 100vw, 1152px"
              className="object-cover object-center"
            />
          </div>
          <figcaption className="border-t border-brass/30 bg-parchment-deep px-5 py-3 font-body text-sm text-ink-soft md:px-6">
            Allied Book Co. · Naqi Market, 75-The Mall, Lahore
          </figcaption>
        </figure>

        {SECONDARY_STOREFRONTS.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {SECONDARY_STOREFRONTS.map((photo) => (
              <div
                key={photo.src}
                className="relative aspect-[4/3] overflow-hidden border border-brass/40"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        <div className="map-panel mt-12 grid gap-10 p-8 md:grid-cols-2 md:gap-12 md:p-10 lg:gap-16">
          <div>
            <p className="eyebrow">Lahore Office</p>
            <h3 className="mt-2 font-display text-3xl text-ink">Find us</h3>
            <address className="mt-5 not-italic font-body text-lg leading-relaxed text-ink-soft">
              Naqi Market, 75-The Mall
              <br />
              Lahore, Pakistan
            </address>
            <a
              href="mailto:info@alliedbook.com"
              className="mt-5 inline-block font-body text-lg text-[#2563EB] transition hover:underline"
            >
              info@alliedbook.com
            </a>
            <a
              href={LAHORE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2.5 font-body text-base text-[#2563EB] transition hover:text-[#1E3A8A]"
            >
              <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                <span className="absolute inset-0 rounded-full bg-[#2563EB]/35 animate-pulse-ring motion-reduce:animate-none" />
                <span className="absolute inset-0 scale-150 rounded-full bg-[#93C5FD]/25 animate-pulse-ring motion-reduce:animate-none [animation-delay:0.6s]" />
                <svg
                  viewBox="0 0 24 24"
                  className="relative h-5 w-5 animate-float motion-reduce:animate-none"
                  fill="currentColor"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
              </span>
              <span className="font-medium underline-offset-4 hover:underline">
                Live location
              </span>
            </a>
          </div>

          <div className="md:border-l md:border-brass/30 md:pl-12">
            <p className="eyebrow">Key contacts</p>
            <ul className="mt-5 space-y-5">
              {OFFICE_CONTACTS.map((person) => (
                <li
                  key={person.name}
                  className="border-b border-brass/20 pb-5 last:border-0 last:pb-0"
                >
                  <p className="font-label text-[0.62rem] uppercase tracking-[0.16em] text-brass">
                    {person.role}
                  </p>
                  <p className="mt-1 font-display text-xl text-ink">
                    {person.name}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Main branch team — Lahore head office */}
      <section className="border-t border-brass/30 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Head office · Lahore</p>
            <h2 className="mt-3 font-display text-4xl text-ink md:text-5xl text-balance">
              Our{" "}
              <em className="text-[#2563EB]">team</em>
            </h2>
            <p className="mt-4 font-body text-lg leading-relaxed text-ink-soft">
              The people behind Allied Book Co. at our head office in Naqi
              Market, The Mall, Lahore.
            </p>
          </div>

          <div className="mt-12 space-y-12 md:space-y-14">
            {MAIN_TEAM_ROWS.map((row, rowIndex) => (
              <ul
                key={rowIndex}
                className={`mx-auto grid justify-items-center gap-8 ${
                  row.length === 2
                    ? "max-w-xl grid-cols-2 sm:gap-12"
                    : "grid-cols-2 sm:grid-cols-4 sm:gap-6 md:gap-8"
                }`}
              >
                {row.map((member) => {
                  const isLead = row.length === 2;
                  return (
                    <li
                      key={`${member.name}-${member.role}`}
                      className="flex w-full max-w-[11rem] flex-col items-center text-center sm:max-w-[12rem]"
                    >
                      <div
                        className={`relative overflow-hidden rounded-full bg-white ring-1 ring-[#E5E7EB] ${
                          isLead
                            ? "h-36 w-36 sm:h-40 sm:w-40 md:h-44 md:w-44"
                            : "h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36"
                        }`}
                      >
                        {member.photo ? (
                          <Image
                            src={member.photo}
                            alt={`${member.name}, ${member.role}`}
                            fill
                            className="object-cover object-top"
                            sizes={isLead ? "176px" : "144px"}
                          />
                        ) : (
                          <span
                            className="flex h-full w-full items-center justify-center font-display text-3xl text-[#1E3A8A]"
                            aria-hidden
                          >
                            {member.initials}
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-4 font-body font-medium leading-snug text-[#2563EB] ${
                          isLead
                            ? "text-sm md:text-base"
                            : "text-[0.8125rem] md:text-sm"
                        }`}
                      >
                        {member.role}
                      </p>
                      <h3
                        className={`mt-2 font-display italic tracking-tight text-ink ${
                          isLead
                            ? "text-2xl md:text-3xl"
                            : "text-lg md:text-xl"
                        }`}
                      >
                        {member.name}
                      </h3>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        </div>
      </section>

      {/* Other branch — secondary to Lahore main */}
      <section className="border-t border-brass/30 bg-parchment-deep">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Also serving</p>
            <h2 className="mt-3 font-display text-4xl text-ink md:text-5xl text-balance">
              Our Rawalpindi{" "}
              <em className="text-[#2563EB]">branch</em>
            </h2>
            <p className="mt-4 font-body text-lg leading-relaxed text-ink-soft">
              Alongside our main Lahore office, we also operate a branch in
              Saddar, Rawalpindi for customers in the twin cities.
            </p>
          </div>

          <article className="map-panel mt-12 grid gap-8 p-7 md:grid-cols-[1.2fr_1fr] md:p-9">
            <div>
              <p className="font-label text-[0.62rem] uppercase tracking-[0.18em] text-brass">
                Branch address
              </p>
              <h3 className="mt-3 font-display text-2xl text-ink md:text-3xl">
                Rizwan Arcade, Saddar
              </h3>
              <address className="mt-4 not-italic font-body text-lg leading-relaxed text-ink-soft">
                Shop No. 5 &amp; 6, 1st Floor
                <br />
                Rizwan Arcade, Adamjee Road
                <br />
                Saddar, Rawalpindi
              </address>
            </div>
            <dl className="space-y-4 border-t border-brass/25 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <div>
                <dt className="font-label text-[0.58rem] uppercase tracking-[0.18em] text-brass">
                  Phone
                </dt>
                <dd className="mt-1.5 space-y-1 font-body text-ink">
                  <a
                    href="tel:+92515519620"
                    className="block transition hover:text-[#2563EB]"
                  >
                    051-5519620
                  </a>
                  <a
                    href="tel:+92515567711"
                    className="block transition hover:text-[#2563EB]"
                  >
                    051-5567711
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-label text-[0.58rem] uppercase tracking-[0.18em] text-brass">
                  Email
                </dt>
                <dd className="mt-1.5 font-body">
                  <a
                    href="mailto:alliedrwp@gmail.com"
                    className="text-[#2563EB] underline-offset-2 hover:underline"
                  >
                    alliedrwp@gmail.com
                  </a>
                </dd>
              </div>
            </dl>
          </article>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <article className="map-panel flex flex-col overflow-hidden sm:flex-row">
              <div className="relative aspect-[4/5] w-full shrink-0 bg-[#EFF6FF] sm:aspect-auto sm:w-40">
                <Image
                  src="/branch-manager-rwp.jpg"
                  alt="Muhammad Siddique, Branch Manager — Islamabad / Rawalpindi"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 100vw, 10rem"
                />
              </div>
              <div className="flex flex-1 flex-col justify-center p-5 md:p-6">
                <p className="font-label text-[0.58rem] uppercase tracking-[0.18em] text-brass">
                  Branch Manager
                </p>
                <h3 className="mt-2 font-display text-xl text-ink md:text-2xl">
                  Muhammad Siddique
                </h3>
                <p className="mt-1 font-body text-sm text-ink-soft">
                  Islamabad / Rawalpindi branch
                </p>
                <dl className="mt-4 space-y-2 border-t border-brass/25 pt-4">
                  <div>
                    <dt className="sr-only">Phone</dt>
                    <dd>
                      <a
                        href="tel:+923335122392"
                        className="font-body text-ink transition hover:text-[#2563EB]"
                      >
                        0333-5122392
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Email</dt>
                    <dd>
                      <a
                        href="mailto:alliedrwp@gmail.com"
                        className="font-body text-[#2563EB] underline-offset-2 hover:underline"
                      >
                        alliedrwp@gmail.com
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </article>

            <article className="map-panel flex flex-col overflow-hidden sm:flex-row">
              <div className="relative aspect-[4/5] w-full shrink-0 bg-[#EFF6FF] sm:aspect-auto sm:w-40">
                <Image
                  src="/executive-manager-rwp.jpg"
                  alt="Muhammad Saeed, Executive Manager — Rawalpindi branch"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 100vw, 10rem"
                />
              </div>
              <div className="flex flex-1 flex-col justify-center p-5 md:p-6">
                <p className="font-label text-[0.58rem] uppercase tracking-[0.18em] text-brass">
                  Executive Manager
                </p>
                <h3 className="mt-2 font-display text-xl text-ink md:text-2xl">
                  Muhammad Saeed
                </h3>
                <p className="mt-1 font-body text-sm text-ink-soft">
                  Rawalpindi branch
                </p>
                <dl className="mt-4 space-y-2 border-t border-brass/25 pt-4">
                  <div>
                    <dt className="sr-only">Phone</dt>
                    <dd>
                      <a
                        href="tel:+923465354675"
                        className="font-body text-ink transition hover:text-[#2563EB]"
                      >
                        0346-5354675
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Email</dt>
                    <dd>
                      <a
                        href="mailto:alliedrwp@gmail.com"
                        className="font-body text-[#2563EB] underline-offset-2 hover:underline"
                      >
                        alliedrwp@gmail.com
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="relative overflow-hidden border-t border-[#1E3A8A]/20"
        style={{
          background:
            "linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #2563EB 100%)",
        }}
      >
        <div className="absolute inset-0 bg-map-grid bg-map-grid opacity-[0.06]" />
        <div className="relative mx-auto max-w-6xl px-5 py-16 text-center md:px-8 md:py-20">
          <h2 className="font-display text-3xl text-white md:text-4xl">
            Ready to explore our catalog?
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-lg text-white/80">
            Browse 10,000+ titles in stock — or see import, delivery, and
            subscription options on our Services page.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/shop"
              className="label-caps border border-white bg-white px-7 py-3.5 text-[0.72rem] text-[#0F172A] transition hover:bg-[#BFDBFE]"
            >
              Browse the shop
            </Link>
            <Link
              href="/contact"
              className="label-caps border border-white/50 px-7 py-3.5 text-[0.72rem] text-white transition hover:bg-white/10"
            >
              Our services
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
