import Image from "next/image";
import Link from "next/link";

const MAPS_URL =
  "https://www.google.com/maps/dir//Allied+Book+Company,+Naqi+Market,+75+Shahrah-e-Quaid-e-Azam,+Mozang+Chungi,+Lahore,+54000/data=!4m6!4m5!1m1!4e2!1m2!1m1!1s0x391904ad34c0f1cf:0x9075cbabf1281693?sa=X&ved=1t:57443&ictx=111";

const NAV_LINKS = [
  { href: MAPS_URL, label: "Location", external: true },
  { href: "/about", label: "About Us", external: false },
  { href: "/contact", label: "Services", external: false },
  { href: "/cart", label: "Cart", external: false },
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
                <p className="eyebrow text-brass-light">Head office · Lahore</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 sm:gap-6">
                  <address className="not-italic font-body text-base leading-relaxed text-white/75">
                    Naqi Market, 75-The Mall
                    <br />
                    Lahore, Pakistan
                  </address>
                  <dl className="space-y-1.5 font-body text-sm text-white/75 sm:text-base">
                    <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                      <dt className="text-white/45">UAN</dt>
                      <dd>
                        <a href="tel:111630630" className="transition hover:text-brass-light">
                          111-630-630
                        </a>
                      </dd>
                    </div>
                    <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
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
                    <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
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
                    <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                      <dt className="text-white/45">Cell</dt>
                      <dd>
                        <a href="tel:03375917645" className="transition hover:text-brass-light">
                          03375917645
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="border-t border-white/15 pt-6">
                <p className="eyebrow text-brass-light">Branch office · Rawalpindi</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 sm:gap-6">
                  <address className="not-italic font-body text-base leading-relaxed text-white/75">
                    Shop No. 5 &amp; 6, 1st Floor
                    <br />
                    Rizwan Arcade, Adamjee Road
                    <br />
                    Saddar, Rawalpindi
                  </address>
                  <dl className="space-y-1.5 font-body text-sm text-white/75 sm:text-base">
                    <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                      <dt className="text-white/45">PH.</dt>
                      <dd className="space-y-0.5">
                        <a
                          href="tel:+92515519620"
                          className="block transition hover:text-brass-light"
                        >
                          051-5519620
                        </a>
                        <a
                          href="tel:+92515567711"
                          className="block transition hover:text-brass-light"
                        >
                          051-5567711
                        </a>
                      </dd>
                    </div>
                    <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                      <dt className="text-white/45">Email</dt>
                      <dd>
                        <a
                          href="mailto:alliedrwp@gmail.com"
                          className="transition hover:text-brass-light"
                        >
                          alliedrwp@gmail.com
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>
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
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between py-3.5 font-body text-lg text-white/80 transition hover:text-brass-light"
                    >
                      {link.label}
                      <span className="text-white/30" aria-hidden>
                        →
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="flex items-center justify-between py-3.5 font-body text-lg text-white/80 transition hover:text-brass-light"
                    >
                      {link.label}
                      <span className="text-white/30" aria-hidden>
                        →
                      </span>
                    </Link>
                  )}
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
