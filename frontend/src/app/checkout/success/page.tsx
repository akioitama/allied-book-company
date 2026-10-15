import Link from "next/link";

export const metadata = { title: "Order confirmed" };

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-center md:px-8">
      <p className="eyebrow mb-3">Thank you</p>
      <h1 className="font-display text-4xl text-ink">Order confirmed</h1>
      <p className="mt-4 font-body text-lg leading-relaxed text-ink-soft">
        Your order has been received. We will contact you if we need any
        further details about delivery.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/shop"
          className="label-caps border border-oxblood bg-oxblood px-5 py-3 text-[0.7rem] text-parchment"
        >
          Continue shopping
        </Link>
        <Link
          href="/contact"
          className="label-caps border border-brass/50 px-5 py-3 text-[0.7rem] text-ink transition hover:border-oxblood hover:text-oxblood"
        >
          Services
        </Link>
      </div>
    </div>
  );
}
