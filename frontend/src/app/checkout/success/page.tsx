import Link from "next/link";

type CheckoutSuccessPageProps = {
  searchParams?: { via?: string | string[] };
};

export const metadata = { title: "Order confirmed" };

export default function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  // `via=manual` is set when the order reached us but the email relay asked for
  // a one-time confirmation — the page must not claim a notification went out.
  const needsManualConfirmation = searchParams?.via === "manual";

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-center md:px-8">
      <p className="eyebrow mb-3">Thank you</p>
      <h1 className="font-display text-4xl text-ink">Order confirmed</h1>
      <p className="mt-4 font-body text-lg leading-relaxed text-ink-soft">
        Your order has been placed. Our team will contact you for further
        assistance.
      </p>
      {needsManualConfirmation ? (
        <p className="mt-4 border border-oxblood/40 bg-oxblood/5 px-3 py-2 font-body text-sm text-ink">
          Our order notification is pending a one-time confirmation, so please
          also send your order details on{" "}
          <a
            href="https://wa.me/923375917645"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563EB] underline-offset-2 hover:underline"
          >
            WhatsApp
          </a>{" "}
          or{" "}
          <a
            href="mailto:info@alliedbook.com"
            className="text-[#2563EB] underline-offset-2 hover:underline"
          >
            email us
          </a>{" "}
          and we will confirm your order right away.
        </p>
      ) : null}
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
