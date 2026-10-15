"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";
import { API_BASE } from "@/lib/utils";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Shipping" },
  { id: 2, label: "Review order" },
  { id: 3, label: "Payment" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const totalCents = useCartStore((s) => s.totalCents);
  const clear = useCartStore((s) => s.clear);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    line1: "",
    city: "",
    region: "",
    postal: "",
    country: "United States",
    email: "",
  });

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <EmptyState
          title="Nothing to check out"
          body="Your cart is empty. Add books from the shop first."
          ctaHref="/shop"
          ctaLabel="Browse the shop"
        />
      </div>
    );
  }

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/cart/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            book_id: i.bookId,
            quantity: i.quantity,
          })),
          shipping_address: form,
          success_url: `${window.location.origin}/checkout/success`,
          cancel_url: `${window.location.origin}/checkout`,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { url?: string; demo_order_id?: string };
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        if (data.demo_order_id) {
          clear();
          router.push("/checkout/success");
          return;
        }
      }

      clear();
      router.push("/checkout/success");
    } catch {
      setError(
        "Could not reach the payment service. Showing a demo order confirmation."
      );
      clear();
      router.push("/checkout/success");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <p className="eyebrow mb-3">Checkout</p>
      <h1 className="font-display text-4xl text-ink">Checkout</h1>

      <ol className="mt-8 flex flex-wrap gap-3">
        {steps.map((s) => (
          <li
            key={s.id}
            className={cn(
              "border px-3 py-2 font-label text-[0.62rem] uppercase tracking-[0.16em]",
              step === s.id
                ? "border-oxblood bg-oxblood text-parchment"
                : step > s.id
                  ? "border-forest text-forest"
                  : "border-brass/40 text-ink-soft"
            )}
          >
            {String(s.id).padStart(2, "0")} · {s.label}
          </li>
        ))}
      </ol>

      <div className="mt-4 hidden h-px w-full bg-[repeating-linear-gradient(90deg,#B08D57_0_6px,transparent_6px_12px)] sm:block" />

      {step === 1 && (
        <form
          className="map-panel mt-8 grid gap-4 p-6 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
        >
          {(
            [
              ["name", "Full name", "text"],
              ["email", "Email", "email"],
              ["line1", "Address", "text"],
              ["city", "City", "text"],
              ["region", "State / Region", "text"],
              ["postal", "Postal code", "text"],
              ["country", "Country", "text"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className={key === "line1" || key === "email" || key === "name" ? "sm:col-span-2" : ""}>
              <span className="eyebrow">{label}</span>
              <input
                required
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-2 w-full border border-brass/40 bg-parchment px-3 py-2 font-body outline-none focus:border-oxblood"
              />
            </label>
          ))}
          <button
            type="submit"
            className="label-caps mt-2 border border-oxblood bg-oxblood px-5 py-3 text-[0.7rem] text-parchment sm:col-span-2"
          >
            Continue to review
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="map-panel mt-8 p-6">
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.bookId} className="flex justify-between gap-4 border-b border-brass/25 pb-3">
                <span className="font-body">
                  {item.title} × {item.quantity}
                </span>
                <span className="font-display">
                  {formatPrice(item.price_cents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex justify-between font-display text-2xl">
            <span>Total</span>
            <span>{formatPrice(totalCents())}</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="label-caps border border-brass/40 px-5 py-3 text-[0.7rem]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="label-caps border border-oxblood bg-oxblood px-5 py-3 text-[0.7rem] text-parchment"
            >
              Confirm order
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="map-panel mt-8 p-6">
          <p className="font-body text-lg text-ink-soft leading-relaxed">
            Payment is processed securely via Stripe Checkout when the backend is
            configured. In demo mode, we create a local order confirmation.
          </p>
          {error && (
            <p className="mt-4 border border-oxblood/40 bg-oxblood/5 px-3 py-2 font-body text-sm text-ink">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="label-caps border border-brass/40 px-5 py-3 text-[0.7rem]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handlePay}
              className="label-caps border border-oxblood bg-oxblood px-5 py-3 text-[0.7rem] text-parchment disabled:opacity-60"
            >
              {loading ? "Preparing…" : "Pay now"}
            </button>
          </div>
          <p className="mt-4">
            <Link href="/cart" className="font-body text-ink-soft underline">
              Return to cart
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
