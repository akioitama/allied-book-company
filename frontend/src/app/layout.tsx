import type { Metadata } from "next";
import { Fraunces, Literata, Outfit } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MainShell } from "@/components/layout/MainShell";
import { InkTrail } from "@/components/ui/InkTrail";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
  style: ["normal", "italic"],
});

const body = Literata({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const label = Outfit({
  subsets: ["latin"],
  variable: "--font-label",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Allied Book Co. — Blue Atlas House",
    template: "%s · Allied Book Co.",
  },
  description:
    "An online bookstore with a blue atlas identity — browse shelves, search titles, and chart your next read.",
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
      </body>
    </html>
  );
}
