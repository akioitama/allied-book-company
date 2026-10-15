import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/shop", label: "The Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Services" },
  { href: "/cart", label: "Cart" },
] as const;

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-brass/30 bg-ink text-white">
      <div className="absolute inset-0 bg-map-grid bg-map-grid opacity-15" />
      <div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-oxblood/30 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-16">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
          {/* Brand + contact */}
          <div className="flex flex-col">
            <Link href="/" className="inline-flex items-center gap-3 self-start">
              <Image
                src="/logo.png"
                alt="Allied Book Co."
                width={48}
                height={44}
                className="h-11 w-auto"
              />
              <span className="font-display text-3xl leading-none tracking-tight">
                Allied Book Co.
              </span>
            </Link>

            <div className="mt-8 space-y-6 border-t border-white/15 pt-8">
              <div>
                <p className="eyebrow text-brass-light">Visit us</p>
                <address className="mt-3 not-italic font-body text-base leading-relaxed text-white/75">
                  Naqi Market, 75-The Mall
                  <br />
                  Lahore, Pakistan
                </address>
              </div>

              <div>
                <p className="eyebrow text-brass-light">Contact</p>
                <dl className="mt-3 space-y-2 font-body text-base text-white/75">
                  <div className="grid grid-cols-[4.5rem_1fr] gap-x-3">
                    <dt className="text-white/45">UAN</dt>
                    <dd>
                      <a href="tel:111630630" className="transition hover:text-brass-light">
                        111-630-630
                      </a>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[4.5rem_1fr] gap-x-3">
                    <dt className="text-white/45">PH.</dt>
                    <dd>
                      <a href="tel:36285621" className="transition hover:text-brass-light">
                        36285621-22
                      </a>
                      ,{" "}
                      <a href="tel:3630662" className="transition hover:text-brass-light">
                        3630662
                      </a>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[4.5rem_1fr] gap-x-3">
                    <dt className="text-white/45">Email</dt>
                    <dd>
                      <a
                        href="mailto:info@alliedbook.com"
                        className="transition hover:text-brass-light"
                      >
                        info@alliedbook.com
                      </a>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[4.5rem_1fr] gap-x-3">
                    <dt className="text-white/45">Cell</dt>
                    <dd>
                      <a href="tel:03028414014" className="transition hover:text-brass-light">
                        03028414014
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Navigate — mirrored column */}
          <div className="flex flex-col md:border-l md:border-white/15 md:pl-16">
            <p className="font-display text-3xl leading-none tracking-tight text-white/90">
              Navigate
            </p>
            <ul className="mt-8 space-y-0 border-t border-white/15 pt-8">
              {NAV_LINKS.map((link) => (
                <li key={link.href} className="border-b border-white/10 last:border-0">
                  <Link
                    href={link.href}
                    className="flex items-center justify-between py-3.5 font-body text-lg text-white/80 transition hover:text-brass-light"
                  >
                    {link.label}
                    <span className="text-white/30" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 px-5 py-4 text-center font-label text-[0.6rem] uppercase tracking-[0.2em] text-white/40">
        © {new Date().getFullYear()} Allied Book Co.
      </div>
    </footer>
  );
}
