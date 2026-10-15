import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "About Us" };

const STATS = [
  { value: "1984", label: "Established" },
  { value: "10,000+", label: "Titles in stock" },
  { value: "40+", label: "Years of service" },
  { value: "Global", label: "Publisher network" },
] as const;

const HIGHLIGHTS = [
  {
    title: "Dedicated Team",
    body: "Our dedicated team always strives hard to serve the customers.",
    icon: "team",
  },
  {
    title: "Customer's Suggestions",
    body: "We thankfully acknowledge the continuous support and suggestions we have been getting from our valued clients for improvement in serving our customers more effectively.",
    icon: "feedback",
  },
  {
    title: "Publishing",
    body: "We feel pride in publishing and distributing the work of renowned scholars of the country. So we offer our services to publish & distribute work of national scholars in higher education through our established and efficient distribution network throughout the country.",
    icon: "publish",
  },
  {
    title: "E-books",
    body: "Considering the future trends of digitization, a counter has been made functional for e-products within our system.",
    icon: "ebook",
  },
  {
    title: "Cheap / ISE Editions",
    body: "As we are working in a price conscious environment, it has been our utmost effort to bring in less expensive Books for our readers.",
    icon: "value",
  },
  {
    title: "In Stock Titles",
    body: "stock",
    icon: "catalog",
  },
] as const;

const SERVICES = [
  {
    title: "Import Orders",
    body: "We offer our services to the institutions and individual readers for importing books and reading material against confirm orders.",
  },
  {
    title: "Air Freight Free",
    body: "We bear expenses of air freight at our own using air lift to get the books from leading academic publishers of the world. It takes 5-8 weeks to get the books over here.",
  },
  {
    title: "Free Delivery",
    body: "The books are delivered to institutional customer at their doorstep free of charge.",
    italic: true,
  },
  {
    title: "Subscription Services",
    body: "Services for subscription of international research journals (print & online) are available for institutional and individual customers against pre-payment as per international subscription system.",
  },
  {
    title: "Services For Pharmaceutical Industry",
    body: "We promote relevant publications from various publishers, to the pharmaceutical industry. We cater bulk specific orders and distribution to their medical fraternity.",
  },
] as const;

/** Lahore (main / head office) — ordered by seniority. */
const MAIN_TEAM: {
  name: string;
  role: string;
  phone?: string;
  phoneDisplay?: string;
  photo?: string;
  initials: string;
}[] = [
  {
    name: "Mr. Nasrullah",
    role: "Managing Director",
    phone: "03028414014",
    phoneDisplay: "0302-8414014",
    photo: "/team/nasrullah.jpg",
    initials: "MN",
  },
  {
    name: "Khalid Ali",
    role: "Operations Manager",
    photo: "/team/khalid-ali.jpg",
    initials: "KA",
  },
  {
    name: "Zia Ullah",
    role: "Sales Manager",
    phone: "03444224121",
    phoneDisplay: "0344-4224121",
    photo: "/team/zia-ullah.jpg",
    initials: "ZU",
  },
  {
    name: "Ammar NasrUllah",
    role: "Online Trade Manager",
    phone: "03054067165",
    phoneDisplay: "0305-4067165",
    photo: "/team/ammar-nasrullah.jpg",
    initials: "AN",
  },
  {
    name: "Atif Ishfaq",
    role: "Sales Executive",
    phone: "03157588266",
    phoneDisplay: "0315-7588266",
    photo: "/team/atif-ishfaq.jpg",
    initials: "AI",
  },
  {
    name: "Khalid Javed",
    role: "Sales Executive",
    photo: "/team/khalid-javed.jpg",
    initials: "KJ",
  },
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
    phone: "03375917645",
    phoneDisplay: "0337-5917645",
    photo: "/team/muhammad-ameen.jpg",
    initials: "MA",
  },
];

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function HighlightIcon({ type }: { type: string }) {
  const cls = "h-6 w-6 text-[#2563EB]";
  switch (type) {
    case "team":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="9" cy="8" r="3.5" />
          <circle cx="17" cy="9.5" r="2.5" />
          <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14 19c0-2.2 1.8-4 4-4" strokeLinecap="round" />
        </svg>
      );
    case "feedback":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M4 5h16v11H7l-3 3V5z" strokeLinejoin="round" />
          <path d="M8 10h8M8 13h5" strokeLinecap="round" />
        </svg>
      );
    case "publish":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" />
          <path d="M8 4v13a3 3 0 0 0 3 3M19 7h1a2 2 0 0 1 2 2v10H9" strokeLinecap="round" />
        </svg>
      );
    case "ebook":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
        </svg>
      );
    case "value":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.3L12 15.8 7.2 17.8l.9-5.3L4.2 8.7l5.4-.8L12 3z" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M4 6h16M4 10h16M4 14h10M4 18h7" strokeLinecap="round" />
          <rect x="3" y="4" width="18" height="16" rx="1" />
        </svg>
      );
  }
}

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden pt-[8.75rem] text-white md:pt-[7.5rem]"
        style={{
          background:
            "linear-gradient(150deg, #0F172A 0%, #1E3A8A 45%, #2563EB 100%)",
        }}
      >
        <div className="absolute inset-0 bg-map-grid bg-map-grid opacity-[0.07]" />
        <div className="absolute -right-24 top-12 h-72 w-72 rounded-full bg-[#93C5FD]/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#1E3A8A]/40 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-8 md:pb-28 md:pt-14">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
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
            <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-white/85 md:text-xl">
              The Knowledge Provider — serving higher education institutions and
              individual scholars with quality books and reading material across
              Pakistan.
            </p>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
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

      {/* Highlights */}
      <section className="border-y border-brass/30 bg-parchment-deep">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow">What we offer</p>
            <h2 className="mt-3 font-display text-4xl text-ink md:text-5xl text-balance">
              Built for readers,{" "}
              <em className="text-[#2563EB]">institutions & scholars</em>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HIGHLIGHTS.map((item, index) => (
              <article
                key={item.title}
                className="group map-panel flex flex-col p-7 transition hover:border-[#2563EB]/40 hover:shadow-lift md:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#EFF6FF] ring-1 ring-[#BFDBFE] transition group-hover:bg-[#DBEAFE]">
                    <HighlightIcon type={item.icon} />
                  </span>
                  <span className="font-label text-[0.58rem] uppercase tracking-[0.2em] text-brass">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl text-ink">
                  {item.title}
                </h3>
                <p className="mt-3 flex-1 font-body leading-relaxed text-ink-soft">
                  {item.body === "stock" ? (
                    <>
                      Our database has an inventory of approx 10,000 titles
                      available in the ready stock that has been classified by
                      subjects for customer&apos;s convenience. Complete range
                      of stocks is available on our website{" "}
                      <a
                        href="https://www.alliedbook.com"
                        className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
                      >
                        www.alliedbook.com
                      </a>
                      .
                    </>
                  ) : (
                    item.body
                  )}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="text-center">
          <p className="eyebrow">How we serve you</p>
          <h2 className="mt-3 font-display text-4xl text-ink md:text-5xl">
            Our services
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-ink-soft">
            From import orders to journal subscriptions — comprehensive support
            for institutions and individual readers.
          </p>
        </div>

        <div className="relative mt-14">
          <div
            className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-[#2563EB] via-[#BFDBFE] to-transparent md:block"
            aria-hidden
          />

          <ol className="space-y-6">
            {SERVICES.map((service, index) => (
              <li
                key={service.title}
                className="relative md:pl-16"
              >
                <span
                  className="absolute left-0 top-8 hidden h-12 w-12 items-center justify-center rounded-full border-2 border-[#2563EB] bg-white font-display text-lg text-[#2563EB] shadow-ambient md:flex"
                  aria-hidden
                >
                  {index + 1}
                </span>

                <article className="map-panel overflow-hidden">
                  <div className="border-b border-brass/30 bg-[#1E3A8A] px-6 py-3 md:hidden">
                    <span className="font-label text-[0.62rem] uppercase tracking-[0.18em] text-[#93C5FD]">
                      Service {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="p-6 md:p-8">
                    <h3 className="font-display text-2xl text-ink">
                      {service.title}
                    </h3>
                    <p
                      className={`mt-3 max-w-3xl font-body text-lg leading-relaxed text-ink-soft ${
                        "italic" in service && service.italic ? "italic" : ""
                      }`}
                    >
                      {service.body}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ol>
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

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {MAIN_TEAM.map((member) => {
              const isLead = member.role === "Managing Director";
              return (
                <li
                  key={`${member.name}-${member.role}`}
                  className={isLead ? "sm:col-span-2 lg:col-span-3 xl:col-span-4" : undefined}
                >
                  <article
                    className={`map-panel overflow-hidden transition hover:border-[#2563EB]/35 hover:shadow-lift ${
                      isLead
                        ? "flex flex-col border-[#2563EB]/30 bg-[#F8FAFF] sm:flex-row sm:items-stretch"
                        : ""
                    }`}
                  >
                    <div
                      className={`relative shrink-0 bg-white ${
                        isLead
                          ? "aspect-[4/5] w-full sm:aspect-auto sm:w-48 md:w-56"
                          : "aspect-[4/5] w-full"
                      }`}
                    >
                      {member.photo ? (
                        <Image
                          src={member.photo}
                          alt={`${member.name}, ${member.role}`}
                          fill
                          className="object-cover object-top"
                          sizes={
                            isLead
                              ? "(max-width: 640px) 100vw, 224px"
                              : "(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          }
                        />
                      ) : (
                        <span
                          className="flex h-full w-full items-center justify-center font-display text-4xl text-[#1E3A8A] md:text-5xl"
                          aria-hidden
                        >
                          {member.initials}
                        </span>
                      )}
                    </div>
                    <div
                      className={`flex flex-1 flex-col justify-center ${
                        isLead ? "p-5 md:p-8" : "p-4"
                      }`}
                    >
                      <p className="font-label text-[0.55rem] uppercase tracking-[0.16em] text-brass">
                        {member.role}
                      </p>
                      <h3
                        className={`mt-1 font-display text-ink ${
                          isLead ? "text-2xl md:text-3xl" : "text-lg"
                        }`}
                      >
                        {member.name}
                      </h3>
                      {member.phone && member.phoneDisplay ? (
                        <a
                          href={telHref(member.phone)}
                          className="mt-2 inline-block font-body text-sm text-ink-soft transition hover:text-[#2563EB]"
                        >
                          {member.phoneDisplay}
                        </a>
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
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
            Browse 10,000+ titles in stock — or reach out to our team for
            import orders, subscriptions, and institutional delivery.
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
              Services
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
