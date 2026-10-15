import { Suspense } from "react";
import { ShopCatalog } from "@/components/shop/ShopCatalog";

export const metadata = {
  title: "Shop",
};

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
