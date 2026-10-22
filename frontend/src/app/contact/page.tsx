import Link from "next/link";

export const metadata = { title: "Services" };

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

export default function ContactPage() {
  return (
    <>
      <section
        className="relative overflow-hidden pt-[10.75rem] text-white md:pt-[9.5rem]"
        style={{
          background:
            "linear-gradient(150deg, #0F172A 0%, #1E3A8A 45%, #2563EB 100%)",
        }}
      >
        <div className="absolute inset-0 bg-map-grid bg-map-grid opacity-[0.07]" />
        <div className="absolute -right-24 top-12 h-72 w-72 rounded-full bg-[#93C5FD]/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl -translate-y-5 px-5 pb-14 pt-16 text-center md:px-8 md:pb-16 md:pt-20">
          <p className="font-label text-[0.62rem] uppercase tracking-[0.2em] text-[#93C5FD]">
            How we serve you
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
            Our{" "}
            <span className="italic text-[#93C5FD]">services</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-body text-lg leading-relaxed text-white/85 md:text-xl">
            From import orders to journal subscriptions — comprehensive support
            for institutions and individual readers.
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* What we offer */}
      <section className="border-b border-brass/30 bg-parchment-deep">
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

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <div className="text-center">
          <p className="eyebrow">How we serve you</p>
          <h2 className="mt-3 font-display text-4xl text-ink md:text-5xl">
            Our services
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-ink-soft">
            Import orders, delivery, subscriptions, and more for institutions
            and individual readers.
          </p>
        </div>

        <div className="relative mt-14">
          <div
            className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-[#2563EB] via-[#BFDBFE] to-transparent md:block"
            aria-hidden
          />

          <ol className="space-y-6">
            {SERVICES.map((service, index) => (
              <li key={service.title} className="relative md:pl-16">
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
                    <h2 className="font-display text-2xl text-ink">
                      {service.title}
                    </h2>
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

      <section
        className="relative overflow-hidden border-t border-[#1E3A8A]/20"
        style={{
          background:
            "linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #2563EB 100%)",
        }}
      >
        <div className="absolute inset-0 bg-map-grid bg-map-grid opacity-[0.06]" />
        <div className="relative mx-auto max-w-6xl px-5 py-14 text-center md:px-8 md:py-16">
          <h2 className="font-display text-3xl text-white md:text-4xl">
            Need a quote or institutional order?
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-lg text-white/80">
            Visit our About page for office locations, storefront photos, and
            direct contact lines — or browse the catalog online.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/about"
              className="label-caps border border-white bg-white px-7 py-3.5 text-[0.72rem] text-[#0F172A] transition hover:bg-[#BFDBFE]"
            >
              About &amp; contact
            </Link>
            <Link
              href="/shop"
              className="label-caps border border-white/50 px-7 py-3.5 text-[0.72rem] text-white transition hover:bg-white/10"
            >
              Browse the shop
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
