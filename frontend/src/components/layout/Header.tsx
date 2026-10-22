"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cart";
import { SearchBar } from "@/components/layout/SearchBar";
import { SubjectsMenu } from "@/components/layout/SubjectsMenu";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  const count = items.reduce((n, i) => n + i.quantity, 0);

  useEffect(() => setMounted(true), []);

  const navLink = (href: string, label: string, size: "md" | "sm" = "md") => (
    <Link
      href={href}
      className={cn(
        "label-caps inline-flex h-5 items-center leading-none text-white/85 transition hover:text-white",
        size === "md" ? "text-[0.7rem]" : "text-[0.62rem]",
        pathname.startsWith(href) && "text-white"
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="border-b border-white/10 bg-[#0B1220] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-2.5 md:justify-between md:px-8">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex animate-van-drive motion-reduce:animate-none"
              aria-hidden
            >
              <DeliveryVanIcon />
            </span>
            <p className="font-label text-[0.68rem] uppercase tracking-[0.14em]">
              <span className="mr-1.5 inline-block animate-promo-pulse rounded-sm motion-reduce:animate-none">
                <span className="inline-block rounded-sm bg-gradient-to-r from-[#60A5FA] via-white to-[#60A5FA] bg-[length:200%_100%] px-2 py-0.5 font-semibold text-[#0F172A] animate-promo-shimmer motion-reduce:animate-none">
                  Free
                </span>
              </span>
              <span className="text-white/90">
                standard delivery on orders above Rs 8,000
              </span>
            </p>
          </div>
          <div
            className="flex items-center gap-2"
            aria-label="Accepted payment methods"
          >
            <span className="hidden font-label text-[0.58rem] uppercase tracking-[0.16em] text-white/50 sm:inline">
              We accept
            </span>
            <VisaBadge />
            <MastercardBadge />
            <CodBadge />
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 bg-[#152238] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2 md:px-8">
          <a
            href="mailto:info@alliedbook.com"
            className="font-label text-[0.65rem] tracking-[0.06em] text-[#93C5FD] transition hover:text-white"
          >
            info@alliedbook.com
          </a>
          <span className="text-white/25" aria-hidden>
            |
          </span>
          <a
            href="tel:+923375917645"
            className="font-label text-[0.65rem] tracking-[0.06em] text-[#93C5FD] transition hover:text-white"
          >
            0337-5917645
          </a>
        </div>
      </div>

      <div className="border-b border-white/15 bg-[#1E3A8A] text-white shadow-ambient">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 md:gap-4 md:px-8 md:py-4">
          <Link href="/" className="group flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Allied Book Co."
              width={48}
              height={44}
              priority
              className="h-10 w-auto md:h-11"
            />
            <span className="font-display text-lg leading-none text-white md:text-xl">
              Allied Book Co.
            </span>
          </Link>

          <nav
            className="hidden items-center gap-7 md:flex"
            aria-label="Primary"
          >
            {navLink("/shop", "Shop")}
            <SubjectsMenu inverted />
            {navLink("/about", "About Us")}
            {navLink("/contact", "Services")}
          </nav>

          <SearchBar
            transparent
            className="order-last w-full max-w-none basis-full md:order-none md:mx-3 md:min-w-0 md:flex-[2] lg:flex-[3] lg:max-w-2xl xl:max-w-3xl"
          />

          <div className="flex items-center">
            <Link
              href="/cart"
              className="relative label-caps inline-flex items-center gap-2 border border-white/45 px-3 py-2 text-[0.65rem] text-white transition hover:border-white hover:bg-white/10"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <path
                  d="M3 5h2l2.2 11h11.3l2-8H7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="20" r="1.2" fill="currentColor" />
                <circle cx="17" cy="20" r="1.2" fill="currentColor" />
              </svg>
              Cart
              {mounted && count > 0 && (
                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#0F172A] px-1 font-label text-[0.6rem] text-white">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        <nav
          className="flex items-center justify-center gap-5 border-t border-white/15 px-4 py-2 md:hidden"
          aria-label="Mobile"
        >
          {navLink("/shop", "Shop", "sm")}
          <SubjectsMenu inverted className="[&_button]:text-[0.62rem]" />
          {navLink("/about", "About Us", "sm")}
          {navLink("/contact", "Services", "sm")}
        </nav>
      </div>
    </header>
  );
}

function DeliveryVanIcon() {
  return (
    <svg
      viewBox="0 0 40 22"
      className="h-5 w-9 text-[#93C5FD]"
      fill="none"
      aria-hidden
    >
      <path
        d="M2 14.5h1.2V8.2c0-.7.5-1.2 1.2-1.2h14.8c.6 0 1.1.5 1.1 1.1v6.4H28"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M20.3 7H25l4.2 4.2v3.3h-2.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M25.2 7.2v3.8h3.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <rect x="4.2" y="8.4" width="5.2" height="3.2" rx="0.4" fill="#60A5FA" opacity="0.85" />
      <rect x="10.4" y="8.4" width="5.2" height="3.2" rx="0.4" fill="#60A5FA" opacity="0.55" />
      <g className="origin-[9px_16.5px] animate-van-wheel motion-reduce:animate-none">
        <circle cx="9" cy="16.5" r="2.4" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="9" cy="16.5" r="0.7" fill="currentColor" />
      </g>
      <g className="origin-[24.5px_16.5px] animate-van-wheel motion-reduce:animate-none">
        <circle cx="24.5" cy="16.5" r="2.4" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="24.5" cy="16.5" r="0.7" fill="currentColor" />
      </g>
      <path
        d="M31 12.5h4.5M32.2 10.8h3.3M33.4 9.1h2.1"
        stroke="#60A5FA"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

function VisaBadge() {
  return (
    <span
      title="Visa"
      className="group relative inline-flex h-6 w-[42px] overflow-hidden rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.35)] ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(26,31,113,0.45)]"
    >
      <svg viewBox="0 0 42 24" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="visa-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1A1F71" />
            <stop offset="100%" stopColor="#2B3990" />
          </linearGradient>
        </defs>
        <rect width="42" height="24" rx="4" fill="url(#visa-bg)" />
        <rect x="0" y="7" width="42" height="4" fill="#F7B600" opacity="0.95" />
        <text
          x="21"
          y="18.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="7.5"
          fontWeight="700"
          fontFamily="Arial, Helvetica, sans-serif"
          letterSpacing="0.5"
        >
          VISA
        </text>
      </svg>
      <span className="sr-only">Visa</span>
    </span>
  );
}

function MastercardBadge() {
  return (
    <span
      title="Mastercard"
      className="group relative inline-flex h-6 w-[42px] overflow-hidden rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.35)] ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(0,0,0,0.4)]"
    >
      <svg viewBox="0 0 42 24" className="h-full w-full" aria-hidden>
        <rect width="42" height="24" rx="4" fill="#111827" />
        <circle cx="17" cy="12" r="6" fill="#EB001B" />
        <circle cx="25" cy="12" r="6" fill="#F79E1B" />
        <path
          d="M21 7.2a6 6 0 0 1 0 9.6 6 6 0 0 1 0-9.6z"
          fill="#FF5F00"
        />
      </svg>
      <span className="sr-only">Mastercard</span>
    </span>
  );
}

function CodBadge() {
  return (
    <span
      title="Cash on delivery"
      className="group relative inline-flex h-6 w-[42px] overflow-hidden rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.35)] ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(22,101,52,0.4)]"
    >
      <svg viewBox="0 0 42 24" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="cod-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
        </defs>
        <rect width="42" height="24" rx="4" fill="url(#cod-bg)" />
        <rect x="8" y="7" width="10" height="10" rx="1.2" fill="#BBF7D0" opacity="0.95" />
        <path d="M13 7v10M8 12h10" stroke="#166534" strokeWidth="1" />
        <text
          x="30"
          y="15"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="7"
          fontWeight="700"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          COD
        </text>
      </svg>
      <span className="sr-only">Cash on delivery</span>
    </span>
  );
}
