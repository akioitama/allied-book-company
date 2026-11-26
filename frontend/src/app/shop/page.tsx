import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopCatalog } from "@/components/shop/ShopCatalog";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

function first(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

/**
 * Every filter combination is a distinct URL. Keep one canonical address per
 * shelf so crawlers don't index (and re-request) endless parameter variants,
 * and keep free-text search pages out of the index entirely — those are
 * user-specific and would otherwise be crawled thousands of times.
 */
export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const sp = new URLSearchParams();
  for (const key of ["q", "category", "author", "brand"]) {
    const value = first(searchParams[key]);
    if (value) sp.set(key, value);
  }
  const query = sp.toString();
  const hasFreeText = Boolean(first(searchParams.q));

  return {
    title: "Shop",
    alternates: { canonical: query ? `/shop?${query}` : "/shop" },
    robots: hasFreeText
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

export default function ShopPage() {
  return (
    <div className="bg-[#F9FAFB] pb-16">
      <Suspense
        fallback={
          <p className="mx-auto max-w-6xl px-5 py-14 font-body text-[#6B7280] md:px-8">
            Loading catalog…
          </p>
        }
      >
        <ShopCatalog />
      </Suspense>
    </div>
  );
}
