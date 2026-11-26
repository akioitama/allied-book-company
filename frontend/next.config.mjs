/** @type {import('next').NextConfig} */
const nextConfig = {
  // One canonical form per path. Slashes are stripped rather than redirected,
  // so a stray "/shop/" does not cost an extra 308 request.
  skipTrailingSlashRedirect: true,
  trailingSlash: false,
  images: {
    // Covers rarely change for a given URL — cache optimized images long-term
    // so Open Library / Google are hit once, not on every page view.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    formats: ["image/webp"],
    // Fewer generated widths = fewer /_next/image CDN variants.
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "books.google.com",
      },
      {
        protocol: "https",
        hostname: "books.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "http",
        hostname: "books.google.com",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      // Open Library redirects real covers here
      {
        protocol: "https",
        hostname: "archive.org",
      },
      {
        protocol: "https",
        hostname: "**.archive.org",
      },
      {
        protocol: "https",
        hostname: "dlhcpuzfgwwcvqgahprm.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      // Hashed build output — the URL changes with the content, so a one-year
      // immutable cache is safe and saves re-requests on every visit.
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Public images / fonts / icons keep a STABLE path (public/logo.png,
      // public/payments/*.svg). They must never be `immutable`: replacing the
      // file at the same URL would leave returning visitors on the old copy for
      // a year with no revalidation. Revalidate instead, so a changed logo is
      // picked up on the next visit while unchanged files cost only a 304.
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|woff|woff2|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      // Answer conditional requests from the browser's HTTP cache as cheaply
      // as possible (no re-sent bytes, no extra asset requests).
      {
        source: "/:path*",
        headers: [{ key: "Vary", value: "Accept-Encoding" }],
      },
    ];
  },
};

export default nextConfig;
