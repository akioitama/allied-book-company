import { formatPrice } from "@/lib/utils";

export const ORDER_NOTIFY_EMAIL = "info@alliedbook.com";

/** Canonical live site — FormSubmit uses this when Origin/Referer is missing or wrong. */
const SITE_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")) ||
  "https://www.alliedbook.com";

export type OrderNotifyPayload = {
  items: Array<{
    title: string;
    author?: string;
    quantity: number;
    price_cents: number;
  }>;
  shipping: {
    name: string;
    email: string;
    phone?: string;
    line1: string;
    city: string;
    region: string;
    postal: string;
    country: string;
  };
  payment_method: "cash_on_delivery" | "upfront" | string;
  subtotal_cents: number;
  delivery_cents: number;
  total_cents: number;
};

function paymentLabel(method?: string) {
  if (method === "upfront") return "Upfront";
  if (method === "cash_on_delivery") return "Cash on delivery";
  return method?.trim() || "Not specified";
}

export function buildOrderText(body: OrderNotifyPayload): string {
  const lines: string[] = [
    "New order — Allied Book Co.",
    "",
    "Customer",
    `  Name: ${body.shipping.name}`,
    `  Email: ${body.shipping.email}`,
  ];
  if (body.shipping.phone?.trim()) {
    lines.push(`  Phone: ${body.shipping.phone.trim()}`);
  }
  lines.push(
    "",
    "Shipping address",
    `  ${body.shipping.line1}`,
    `  ${body.shipping.city}, ${body.shipping.region} ${body.shipping.postal}`,
    `  ${body.shipping.country}`,
    "",
    "Items"
  );

  for (const item of body.items) {
    const lineTotal = formatPrice(item.price_cents * item.quantity);
    const unit = formatPrice(item.price_cents);
    lines.push(
      `  • ${item.title}${item.author ? ` — ${item.author}` : ""}`,
      `      Qty ${item.quantity} × ${unit} = ${lineTotal}`
    );
  }

  lines.push(
    "",
    `Subtotal: ${formatPrice(body.subtotal_cents)}`,
    `Delivery: ${
      body.delivery_cents > 0 ? formatPrice(body.delivery_cents) : "Free"
    }`,
    `Total: ${formatPrice(body.total_cents)}`,
    `Payment method: ${paymentLabel(body.payment_method)}`,
    "",
    "Please contact the customer to confirm payment / delivery."
  );

  return lines.join("\n");
}

/**
 * Send order email from the browser via FormSubmit.
 * FormSubmit blocks many server-side calls; client-side works on localhost / Vercel.
 */
export async function sendOrderEmailFromBrowser(
  body: OrderNotifyPayload
): Promise<{ ok: true; needsActivation?: boolean } | { ok: false; error: string }> {
  const subject = `New order from ${body.shipping.name} — Allied Book Co.`;
  const message = buildOrderText(body);

  try {
    // FormSubmit ties activation to the submitting domain. Prefer the real
    // browser location; fall back to the public site URL (never invent localhost).
    const pageUrl =
      typeof window !== "undefined" && window.location?.href
        ? window.location.href
        : `${SITE_URL}/checkout`;
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : SITE_URL;

    const res = await fetch(
      `https://formsubmit.co/ajax/${encodeURIComponent(ORDER_NOTIFY_EMAIL)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // Help FormSubmit see the live domain (stricter referrer policies hide path).
        referrerPolicy: "strict-origin-when-cross-origin",
        body: JSON.stringify({
          _subject: subject,
          _captcha: "false",
          _template: "table",
          _replyto: body.shipping.email,
          // FormSubmit reads _url for the domain shown in activation emails.
          _url: pageUrl,
          website: origin,
          name: body.shipping.name,
          email: body.shipping.email,
          phone: body.shipping.phone?.trim() || "—",
          payment_method: paymentLabel(body.payment_method),
          address: `${body.shipping.line1}, ${body.shipping.city}, ${body.shipping.region} ${body.shipping.postal}, ${body.shipping.country}`,
          message,
        }),
      }
    );

    const raw = await res.text();
    let data: { success?: string | boolean; message?: string } = {};
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      /* FormSubmit sometimes returns HTML */
    }

    const success =
      data.success === true ||
      data.success === "true" ||
      (res.ok && !raw.toLowerCase().includes("error"));

    if (!success) {
      const msg = (data.message || raw || "").toLowerCase();
      if (msg.includes("html files") || msg.includes("web server")) {
        return {
          ok: false,
          error:
            "Order email service needs the site running on localhost or the live URL. Open http://localhost:3000 (npm run dev) and try again.",
        };
      }
      return {
        ok: false,
        error:
          data.message ||
          "Could not send the order email. Check Spam for a FormSubmit activation message, confirm it, then place the order again.",
      };
    }

    const needsActivation = Boolean(
      (data.message || "").toLowerCase().includes("confirm") ||
        (data.message || "").toLowerCase().includes("activate")
    );

    return { ok: true, needsActivation };
  } catch {
    return {
      ok: false,
      error:
        "Could not reach the email service. Check your internet connection and try again.",
    };
  }
}
