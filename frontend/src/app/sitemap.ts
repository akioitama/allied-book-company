import type { MetadataRoute } from "next";
import { listBooks } from "@/lib/books/supabase-books";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
  "https://www.alliedbook.com";

/** Titles listed per sitemap chunk (one request per 48 book pages, max 500). */
const PAGE_SIZE = 48;
const MAX_BOOK_PAGES = 20;

export const revalidate = 60 * 60 * 24;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Book pages are prerendered with `revalidate = 300`, so listing them tells
  // crawlers the canonical URL for each title instead of letting them walk
  // filtered shop URLs (which is what produced most of the crawl traffic).
  const books: MetadataRoute.Sitemap = [];
  try {
    for (let page = 1; page <= MAX_BOOK_PAGES; page += 1) {
      const { books: rows, total } = await listBooks({
        page,
        pageSize: PAGE_SIZE,
        orderBy: "created_at",
        ascending: false,
        withCount: page === 1,
      });
      for (const book of rows) {
        if (!book.slug) continue;
        books.push({
          url: `${SITE_URL}/shop/${book.slug}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
      if (rows.length < PAGE_SIZE) break;
      if (page === 1 && Number.isFinite(total) && total <= PAGE_SIZE) break;
    }
  } catch {
    // Sitemap must still render (static routes) if the catalog read fails.
  }

  return [...staticRoutes, ...books];
}
