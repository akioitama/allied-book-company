"use client";

import { useEffect, useRef, useState } from "react";
import {
  PAYMENT_INSTRUCTIONS,
  PAYMENT_OPTIONS,
  isPlaceholder,
} from "@/lib/orders/payment";

/** Copy-to-clipboard button used on the account numbers / IBAN. */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Older browsers / non-secure contexts.
        const area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="label-caps shrink-0 border border-brass/50 px-2 py-1 text-[0.58rem] text-oxblood transition hover:border-oxblood hover:bg-oxblood/5"
      aria-label="Copy to clipboard"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/**
 * The three upfront-payment channels (JazzCash, Easypaisa, UBL bank transfer).
 * Details come from `PAYMENT_OPTIONS` so the admin edits them in one place.
 */
export function PaymentDetails() {
  return (
    <div className="mt-4">
      <p className="border-l-2 border-oxblood bg-parchment-deep px-3 py-2 font-body text-sm leading-relaxed text-ink">
        {PAYMENT_INSTRUCTIONS}
      </p>

      <div className="mt-3 space-y-3">
        {PAYMENT_OPTIONS.map((option) => (
          <section
            key={option.id}
            className="border border-brass/40 bg-parchment px-4 py-3"
            aria-label={option.title}
          >
            <p className="font-display text-lg leading-snug text-ink">
              {option.title}
            </p>
            <p className="mt-0.5 font-body text-sm text-ink-soft">
              {option.subtitle}
            </p>
            <dl className="mt-2 space-y-1">
              {option.rows.map((row) => {
                const pending = isPlaceholder(row.value);
                return (
                  <div
                    key={row.label}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-brass/20 py-1 last:border-0"
                  >
                    <dt className="font-label text-[0.62rem] uppercase tracking-[0.14em] text-ink-soft">
                      {row.label}
                    </dt>
                    <dd className="flex items-center gap-2">
                      <span
                        className={
                          pending
                            ? "font-body text-sm italic text-ink-soft"
                            : "font-body text-sm font-semibold text-ink"
                        }
                      >
                        {pending ? "To be confirmed" : row.value}
                      </span>
                      {row.copyable && !pending ? (
                        <CopyButton value={row.value} />
                      ) : null}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
