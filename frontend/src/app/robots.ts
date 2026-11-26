import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
  "https://www.alliedbook.com";

/**
 * Crawlers are welcome on the pages that matter, but not on parameterized
 * search/filter permutations. Each crawled URL is a billable CDN request, and
 * `?q=` pages are user-specific, so they are excluded here (and marked
 * noindex on the page itself). The sitemap then tells crawlers exactly which
 * canonical URLs to fetch, instead of letting them discover what they like.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/shop?*q=", "/cart", "/checkout", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
