import type { Metadata } from "next";
import { Fraunces, Literata, Outfit } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingSocial } from "@/components/layout/FloatingSocial";
import { MainShell } from "@/components/layout/MainShell";
import { InkTrail } from "@/components/ui/InkTrail";
import "./globals.css";

// Keep font files lean — each weight/style is an extra CDN asset on every visit.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  adjustFontFallback: true,
});

const body = Literata({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600"],
  display: "swap",
  adjustFontFallback: true,
});

const label = Outfit({
  subsets: ["latin"],
  variable: "--font-label",
  weight: ["400", "600"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  // One canonical origin. Without this, Next.js can only emit a relative
  // canonical per page, Google keeps crawling the *.vercel.app deployment URL
  // as if it were a second site, and every page is requested twice by crawlers.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.alliedbook.com"
  ),
  title: {
    default: "Allied Book Co. — Blue Atlas House",
    template: "%s · Allied Book Co.",
  },
  description:
    "An online bookstore with a blue atlas identity — browse shelves, search titles, and chart your next read.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${label.variable} font-body`}
      >
        <InkTrail />
        <Header />
        <MainShell>{children}</MainShell>
        <Footer />
        <FloatingSocial />
      </body>
    </html>
  );
}
