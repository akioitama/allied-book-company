import { formatPrice } from "@/lib/utils";
import { paymentOptionLabel } from "@/lib/orders/payment";

export const ORDER_NOTIFY_EMAIL = "info@alliedbook.com";

/** Canonical live site — FormSubmit uses this when Origin/Referer is missing or wrong. */
const SITE_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")) ||
  "https://www.alliedbook.com";

/** Max size of the payment screenshot the API route accepts (mirrored below). */
export const SCREENSHOT_MAX_BYTES = 4 * 1024 * 1024;

/** Attached payment proof sent with an upfront order. */
export type PaymentScreenshot = {
  /** File name shown on the attachment. */
  name: string;
  /** Image MIME type, e.g. `image/png`. */
  mime: string;
  /** Raw base64 (no `data:` prefix). */
  base64: string;
};

export type OrderNotifyPayload = {
  items: Array<{
    title: string;
    author?: string;
    quantity: number;
    price_cents: number;
    /** Digital product — no delivery, and the order must be paid upfront. */
    is_ebook?: boolean;
    /** Book row id — lets the server decrement that book's stock. */
    book_id?: string | null;
    /** Sent so the server can verify e-book status itself. */
    isbn?: string | null;
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
  /** Payee account the customer used: `jazzcash_easypaisa` or `bank_transfer`. */
  payment_account?: string | null;
  /** Order number; the server generates one when it is missing. */
  order_number?: string | null;
  /** Payment proof — required for upfront orders. */
  screenshot?: PaymentScreenshot | null;
  subtotal_cents: number;
  delivery_cents: number;
  total_cents: number;
};

function paymentLabel(method?: string) {
  if (method === "upfront") return "Upfront";
  if (method === "cash_on_delivery") return "Cash on delivery";
  return method?.trim() || "Not specified";
}

/** "Upfront — JazzCash / EasyPaisa", so the inbox knows which account to check. */
export function paymentLabelWithAccount(
  method?: string,
  account?: string | null
) {
  const base = paymentLabel(method);
  const accountLabel = paymentOptionLabel(account);
  return accountLabel ? `${base} — ${accountLabel}` : base;
}

/** Any e-book in the order forces upfront payment. */
export function orderHasEbooks(body: OrderNotifyPayload): boolean {
  return body.items.some((i) => i.is_ebook);
}


export function buildOrderText(body: OrderNotifyPayload): string {
  const lines: string[] = [
    "New order — Allied Book Co.",
    "",
    `Order number: ${body.order_number?.trim() || "(pending)"}`,
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
      `  • ${item.title}${item.author ? ` — ${item.author}` : ""}${
        item.is_ebook ? "  (E-BOOK — no cash on delivery)" : ""
      }`,
      `      Qty ${item.quantity} × ${unit} = ${lineTotal}`
    );
  }

  const hasEbooks = orderHasEbooks(body);
  const deliveryLine = body.delivery_cents > 0
    ? `${formatPrice(body.delivery_cents)}${hasEbooks ? " (physical items only)" : ""}`
    : hasEbooks && !body.items.some((i) => !i.is_ebook)
      ? "Not applicable — all items are e-books"
      : "Free";

  lines.push(
    "",
    `Subtotal: ${formatPrice(body.subtotal_cents)}`,
    `Delivery: ${deliveryLine}`,
    `Total: ${formatPrice(body.total_cents)}`,
    `Payment method: ${paymentLabelWithAccount(
      hasEbooks ? "upfront" : body.payment_method,
      body.payment_account
    )}${hasEbooks ? " (required — order contains an e-book)" : ""}`
  );

  if (body.screenshot) {
    lines.push(`Payment screenshot: ${body.screenshot.name} (attached)`);
  }

  lines.push("", "Please contact the customer to confirm payment / delivery.");

  return lines.join("\n");
}


export type OrderEmailResult =
  | {
      ok: true;
      via: "server" | "formsubmit";
      /** Order number to show on the confirmation page. */
      orderNumber?: string;
      /** FormSubmit asks for a one-time confirmation before it relays mail. */
      needsActivation?: boolean;
    }
  | { ok: false; error: string };

/**
 * Primary sender: the Next.js API route (`/api/orders`), which uses Gmail SMTP
 * or Resend. Those are authenticated channels, so mail is actually delivered.
 * Returns null when the route is unavailable (e.g. `next dev` running a stale
 * build), so the caller can fall back to the browser relay.
 */
async function sendViaApi(body: OrderNotifyPayload): Promise<OrderEmailResult | null> {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      let orderNumber: string | undefined;
      try {
        const data = (await res.json()) as { orderNumber?: string };
        orderNumber = data?.orderNumber;
      } catch {
        // A 200 without JSON still means the order was mailed.
      }
      return { ok: true, via: "server", orderNumber };
    }

    let detail = "";
    try {
      const data = (await res.json()) as { error?: string };
      detail = data?.error?.trim() || "";
    } catch {
      /* route may return a non-JSON error page */
    }

    // 404/405 = route missing; 500 without a message = route crashed. In both
    // cases the browser relay below is worth a shot. Everything else (502 etc.)
    // is a real, reportable mail failure.
    if (res.status === 404 || res.status === 405 || (!detail && res.status >= 500)) {
      return null;
    }
    return {
      ok: false,
      error:
        detail ||
        "Could not send the order email. Please contact us on WhatsApp so we do not miss your order.",
    };
  } catch {
    // Network error — try the browser relay.
    return null;
  }
}

/**
 * Send the order email to the store.
 *
 * Order matters: the API route (authenticated SMTP / provider) is tried first.
 * FormSubmit (free relay, no account) is only a last-ditch fallback — it needs a
 * one-time activation and is rate-limited, so it must not be the primary channel.
 */
export async function sendOrderEmail(body: OrderNotifyPayload): Promise<OrderEmailResult> {
  const viaApi = await sendViaApi(body);
  if (viaApi) return viaApi;
  return sendOrderEmailFromBrowser(body);
}

/** Base64 → Blob so the screenshot can ride along in a multipart post. */
function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** Browser-side FormSubmit relay. Used only when the API route cannot send. */
export async function sendOrderEmailFromBrowser(
  body: OrderNotifyPayload
): Promise<OrderEmailResult> {
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

    const fields: Record<string, string> = {
      _subject: subject,
      _captcha: "false",
      _template: "table",
      _replyto: body.shipping.email,
      // FormSubmit reads _url for the domain shown in activation emails.
      _url: pageUrl,
      website: origin,
      name: body.shipping.name,
      email: body.shipping.email,
      order_number: body.order_number?.trim() || "(pending)",
      phone: body.shipping.phone?.trim() || "—",
      payment_method: paymentLabelWithAccount(
        body.payment_method,
        body.payment_account
      ),
      address: `${body.shipping.line1}, ${body.shipping.city}, ${body.shipping.region} ${body.shipping.postal}, ${body.shipping.country}`,
      message,
    };

    // Multipart keeps the payment screenshot with the order; JSON is simpler
    // when there is nothing to attach.
    let requestBody: BodyInit;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body.screenshot) {
      const form = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        form.append(key, value);
      }
      form.append(
        "attachment",
        base64ToBlob(body.screenshot.base64, body.screenshot.mime),
        body.screenshot.name
      );
      requestBody = form;
    } else {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(fields);
    }

    const res = await fetch(
      `https://formsubmit.co/ajax/${encodeURIComponent(ORDER_NOTIFY_EMAIL)}`,
      {
        method: "POST",
        headers,
        // Help FormSubmit see the live domain (stricter referrer policies hide path).
        referrerPolicy: "strict-origin-when-cross-origin",
        body: requestBody,
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

    return {
      ok: true,
      via: "formsubmit",
      orderNumber: body.order_number ?? undefined,
      needsActivation,
    };
  } catch {
    return {
      ok: false,
      error:
        "Could not reach the email service. Check your internet connection and try again.",
    };
  }
}
