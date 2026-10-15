import Image from "next/image";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata = { title: "Services" };

/** Primary storefront — secondary gallery slots ready for more photos. */
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

const CONTACTS = [
  {
    role: "Manager",
    name: "Mr. Nasrullah",
    phone: "03028414014",
  },
  {
    role: "For General Inquiries",
    name: "Muhammad Ameen",
    phone: "0342-5851388",
  },
  {
    role: "For General Inquiries",
    name: "Mr. Adeel",
    phone: "03054295258",
  },
  {
    role: "Journal / Magazine · Psychological Tests & Tools",
    name: "Mr. Irfan Javed",
    phone: "03124747921",
  },
] as const;

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Correspondence"
        title={
          <>
            Visit the Lahore office — or{" "}
            <em className="text-oxblood">reach us directly</em>
          </>
        }
        subtitle="Allied Book Co. · Naqi Market, The Mall. Email, call, or ask for the desk that matches your inquiry."
      />

      {/* Main storefront */}
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

      <section className="map-panel mt-12 grid gap-10 p-8 md:grid-cols-2 md:gap-12 md:p-10 lg:gap-16">
        <div>
          <p className="eyebrow">Lahore Office</p>
          <h2 className="mt-2 font-display text-3xl text-ink">Find us</h2>
          <address className="mt-5 not-italic font-body text-lg leading-relaxed text-ink-soft">
            Naqi Market, 75-The Mall
            <br />
            Lahore, Pakistan
          </address>
          <a
            href="mailto:info@alliedbook.com"
            className="mt-5 inline-block font-body text-lg text-oxblood transition hover:underline"
          >
            info@alliedbook.com
          </a>
        </div>

        <div className="md:border-l md:border-brass/30 md:pl-12">
          <p className="eyebrow">Direct lines</p>
          <ul className="mt-5 space-y-5">
            {CONTACTS.map((person) => (
              <li
                key={`${person.name}-${person.phone}`}
                className="border-b border-brass/20 pb-5 last:border-0 last:pb-0"
              >
                <p className="font-label text-[0.62rem] uppercase tracking-[0.16em] text-brass">
                  {person.role}
                </p>
                <p className="mt-1 font-display text-xl text-ink">{person.name}</p>
                <a
                  href={telHref(person.phone)}
                  className="mt-1 inline-block font-body text-lg text-oxblood transition hover:underline"
                >
                  {person.phone}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
