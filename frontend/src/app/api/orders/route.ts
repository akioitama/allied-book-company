import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { formatPrice } from "@/lib/utils";
import { cartPricing, isEbookIsbn } from "@/lib/shipping";
import { decrementStockForOrder } from "@/lib/books/stock";
import {
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_MIME_TYPES,
  SCREENSHOT_TYPE_LABEL,
  paymentOptionLabel,
  pendingPaymentDetails,
} from "@/lib/orders/payment";

export const runtime = "nodejs";

type OrderItem = {
  title: string;
  author?: string;
  quantity: number;
  price_cents: number;
  /** Book id — used to decrement stock. */
  book_id?: string | null;
  /** Digital product — no delivery, upfront payment only. */
  is_ebook?: boolean;
  /** Used to detect e-books server-side (client flag is not trusted alone). */
  isbn?: string | null;
};

type OrderScreenshot = {
  name: string;
  mime: string;
  /** Raw base64 (no `data:` prefix). */
  base64: string;
};

type OrderBody = {
  items: OrderItem[];
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
  payment_method?: "cash_on_delivery" | "upfront" | string;
  /** Channel the customer paid into (`jazzcash`, `easypaisa`, `ubl_bank_transfer`). */
  payment_account?: string | null;
  /** Payment proof — required for upfront orders. */
  screenshot?: OrderScreenshot | null;
  subtotal_cents?: number;
  delivery_cents?: number;
  total_cents: number;
};

function paymentLabel(method?: string) {
  if (method === "upfront") return "Upfront";
  if (method === "cash_on_delivery") return "Cash on delivery";
  return method?.trim() || "Not specified";
}

/**
 * Normalizes the uploaded receipt and enforces the same rules the browser
 * applies (type + size), so a hand-crafted request cannot bypass them.
 */
function parseScreenshot(
  raw: unknown
): { screenshot: OrderScreenshot } | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "Payment screenshot is required for upfront orders." };
  }
  const data = raw as Partial<Record<keyof OrderScreenshot, unknown>>;
  const name = typeof data.name === "string" ? data.name.trim().slice(0, 200) : "";
  const mime = typeof data.mime === "string" ? data.mime.trim().toLowerCase() : "";
  const base64 =
    typeof data.base64 === "string"
      ? data.base64.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "")
      : "";

  if (!base64) {
    return { error: "Payment screenshot is required for upfront orders." };
  }
  if (!(SCREENSHOT_MIME_TYPES as readonly string[]).includes(mime)) {
    return { error: `Payment screenshot must be a ${SCREENSHOT_TYPE_LABEL} image.` };
  }
  // base64 is ~4/3 of the byte size; check before decoding.
  if (Math.floor((base64.length * 3) / 4) > SCREENSHOT_MAX_BYTES) {
    return {
      error: `Payment screenshot must be under ${Math.round(
        SCREENSHOT_MAX_BYTES / (1024 * 1024)
      )} MB.`,
    };
  }
  return { screenshot: { name: name || "payment-receipt", mime, base64 } };
}

function screenshotBuffer(screenshot: OrderScreenshot): Buffer {
  return Buffer.from(screenshot.base64, "base64");
}

/** Where order emails are delivered. Comma-separated for multiple inboxes. */
const STORE_EMAIL =
  process.env.ORDER_NOTIFY_EMAIL?.trim() || "info@alliedbook.com";

const STORE_EMAILS = STORE_EMAIL.split(",")
  .map((e) => e.trim())
  .filter(Boolean);

/**
 * `stock` is optional: when present, the email shows the new stock per title so
 * the store can immediately see the inventory change.
 */
function buildOrderText(
  body: OrderBody,
  stock?: {
    applied: { book_id: string; quantity: number; new_stock: number }[];
    warning?: string;
  }
): string {
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
      `  • ${item.title}${item.author ? ` — ${item.author}` : ""}${
        item.is_ebook ? "  (E-BOOK — no cash on delivery)" : ""
      }`,
      `      Qty ${item.quantity} × ${unit} = ${lineTotal}`
    );
  }

  const subtotal =
    body.subtotal_cents != null
      ? body.subtotal_cents
      : body.total_cents - (body.delivery_cents ?? 0);
  const delivery = body.delivery_cents ?? 0;
  const hasEbooks = body.items.some((i) => i.is_ebook);
  const hasPhysical = body.items.some((i) => !i.is_ebook);
  const deliveryLine =
    delivery > 0
      ? `${formatPrice(delivery)}${hasEbooks ? " (physical items only)" : ""}`
      : hasEbooks && !hasPhysical
        ? "Not applicable — all items are e-books"
        : "Free";

  const method = hasEbooks ? "upfront" : body.payment_method;
  const channel = paymentOptionLabel(body.payment_account);
  lines.push(
    "",
    `Subtotal: ${formatPrice(subtotal)}`,
    `Delivery: ${deliveryLine}`,
    `Total: ${formatPrice(body.total_cents)}`,
    `Payment method: ${paymentLabel(method)}${channel ? ` — ${channel}` : ""}${
      hasEbooks ? " (required — order contains an e-book)" : ""
    }`
  );

  if (method === "upfront") {
    lines.push(
      body.screenshot
        ? `Payment screenshot: ${body.screenshot.name} (attached)`
        : "⚠ Payment screenshot MISSING — ask the customer to resend it before shipping."
    );
    // Warn the team when the checkout could not show a real account yet.
    const pending = pendingPaymentDetails();
    if (pending.length) {
      lines.push(
        `⚠ Checkout still shows "To be confirmed" for: ${pending.join(", ")}`
      );
    }
  }

  // Inventory result so the team can see stock actually moved.
  if (stock?.applied?.length) {
    lines.push("", "Stock updated");
    for (const entry of stock.applied) {
      const item = body.items.find(
        (i) => i.book_id === entry.book_id
      );
      lines.push(
        `  • ${item?.title ?? entry.book_id}: −${entry.quantity} → ${entry.new_stock} left`
      );
    }
  }
  if (stock?.warning) {
    lines.push("", `⚠ ${stock.warning}`);
  }

  lines.push("", "Please contact the customer to confirm payment / delivery.");

  return lines.join("\n");
}

/** The receipt rides along as a normal email attachment. */
function receiptAttachments(screenshot?: OrderScreenshot | null) {
  if (!screenshot) return undefined;
  const safeName = screenshot.name.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120);
  return [
    {
      filename: safeName || "payment-receipt",
      content: screenshotBuffer(screenshot),
      contentType: screenshot.mime,
    },
  ];
}

/** Preferred: Gmail SMTP with an App Password (most reliable for testing). */
async function sendViaGmail(
  subject: string,
  text: string,
  replyTo: string,
  to: string[],
  screenshot?: OrderScreenshot | null
) {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) return false;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Allied Book Co." <${user}>`,
    to,
    replyTo,
    subject,
    text,
    attachments: receiptAttachments(screenshot),
  });
  return true;
}

async function sendViaResend(
  subject: string,
  text: string,
  replyTo: string,
  to: string[],
  screenshot?: OrderScreenshot | null
) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;

  // Resend requires a verified domain (or onboarding@resend.dev for testing).
  const from =
    process.env.ORDER_FROM_EMAIL?.trim() ||
    "Allied Book Co. <onboarding@resend.dev>";

  const attachments = screenshot
    ? [
        {
          filename: screenshot.name || "payment-receipt",
          content: screenshot.base64,
        },
      ]
    : undefined;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: replyTo,
      subject,
      text,
      attachments,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend order email failed", err);
    let apiMessage = "";
    try {
      apiMessage = (JSON.parse(err) as { message?: string })?.message || "";
    } catch {
      /* non-JSON error body */
    }
    throw new Error(
      `Email provider rejected the order email${apiMessage ? `: ${apiMessage}` : ""}. ` +
        "Verify the sender domain in Resend or set GMAIL_USER / GMAIL_APP_PASSWORD."
    );
  }
  return true;
}

/** Fallback: FormSubmit (check Spam; first use needs activation email). */
async function sendViaFormSubmit(
  subject: string,
  text: string,
  customer: OrderBody["shipping"],
  paymentMethod?: string
) {
  const res = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(STORE_EMAILS[0])}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: subject,
        _captcha: "false",
        _template: "table",
        _replyto: customer.email,
        name: customer.name,
        email: customer.email,
        phone: customer.phone?.trim() || "—",
        payment_method: paymentLabel(paymentMethod),
        address: `${customer.line1}, ${customer.city}, ${customer.region} ${customer.postal}, ${customer.country}`,
        message: text,
      }),
    }
  );

  const raw = await res.text();
  let data: { success?: string | boolean; message?: string } = {};
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    /* ignore */
  }

  if (!res.ok || data.success === false || data.success === "false") {
    console.error("FormSubmit order email failed", raw.slice(0, 500));
    // FormSubmit sits behind Cloudflare: automated posts often get an HTML
    // "Just a moment..." bot challenge instead of JSON.
    throw new Error(
      "the free fallback relay is blocking automated sends (Cloudflare challenge)"
    );
  }
  return true;
}

function gmailCredentials() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  return { user, pass, ready: Boolean(user && pass) };
}

function resendCredentials() {
  const key = process.env.RESEND_API_KEY?.trim();
  return { key, ready: Boolean(key) };
}

/** True when at least one authenticated sender is configured. */
function serverMailConfigured() {
  return gmailCredentials().ready || resendCredentials().ready;
}

/**
 * Describes the App Password without leaking it: length, whitespace/padding
 * problems are enough to spot the usual paste mistakes.
 */
function describeGmailConfig() {
  const { user, pass } = gmailCredentials();
  const issues: string[] = [];
  if (!user) issues.push("GMAIL_USER is missing or empty");
  if (!pass) {
    issues.push("GMAIL_APP_PASSWORD is missing or empty");
  } else {
    const compact = pass.replace(/\s+/g, "");
    if (pass !== compact) {
      issues.push(
        "GMAIL_APP_PASSWORD contains spaces — use the 16 characters with no spaces"
      );
    }
    if (/^["']|["']$/.test(pass)) {
      issues.push("GMAIL_APP_PASSWORD is wrapped in quotes — remove them");
    }
    if (!/^[a-z]{16}$/.test(compact)) {
      issues.push(
        "GMAIL_APP_PASSWORD does not look like a 16-letter App Password — it may be the account password, a revoked code, or a copy error"
      );
    }
  }
  return {
    user: user || null,
    passwordLength: pass ? pass.length : 0,
    passwordLooksValid: Boolean(
      pass && /^[a-z]{16}$/.test(pass.replace(/\s+/g, ""))
    ),
    issues,
  };
}

export type Failure = { channel: string; reason: string };

/**
 * Tries every configured channel in order and records why each one failed, so
 * the caller can surface an accurate error instead of guessing.
 */
async function sendOrderMail(
  subject: string,
  text: string,
  replyTo: string,
  shipping: OrderBody["shipping"],
  paymentMethod?: string,
  screenshot?: OrderScreenshot | null
): Promise<{ via: string; failures: Failure[] }> {
  const failures: Failure[] = [];

  try {
    if (await sendViaGmail(subject, text, replyTo, STORE_EMAILS, screenshot)) {
      return { via: "gmail", failures };
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error("Gmail send failed", reason);
    failures.push({ channel: "gmail", reason });
  }

  try {
    if (await sendViaResend(subject, text, replyTo, STORE_EMAILS, screenshot)) {
      return { via: "resend", failures };
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error("Resend send failed", reason);
    failures.push({ channel: "resend", reason });
  }

  try {
    if (await sendViaFormSubmit(subject, text, shipping, paymentMethod)) {
      return { via: "formsubmit", failures };
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    failures.push({ channel: "formsubmit", reason });
  }

  throw Object.assign(new Error(orderMailErrorMessage(failures)), { failures });
}

/**
 * Turns collected failures into a message naming the real problem. Only says
 * "not configured" when credentials truly are absent.
 */
function orderMailErrorMessage(failures: Failure[]): string {
  const gmail = failures.find((f) => f.channel === "gmail");
  const resend = failures.find((f) => f.channel === "resend");
  const gmailReady = gmailCredentials().ready;
  const resendReady = resendCredentials().ready;

  if (!gmailReady && !resendReady) {
    return (
      "No email sender is configured on this deployment" +
      (gmail ? ` (${gmail.reason})` : "") +
      ". Set GMAIL_USER + GMAIL_APP_PASSWORD (or RESEND_API_KEY) for the Production environment, then redeploy."
    );
  }
  if (gmail) {
    return `Gmail rejected the order email: ${gmail.reason}`;
  }
  if (resend) {
    return `The email provider rejected the order email: ${resend.reason}`;
  }
  return "Could not send the order email. Please try again.";
}

/**
 * Status check: `GET /api/orders` reports what is configured; add `?test=1`
 * to attempt a real send so the deployment explains itself.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const configured = serverMailConfigured();

  const report: Record<string, unknown> = {
    ok: configured,
    gmail: gmailCredentials().ready,
    resend: resendCredentials().ready,
    gmailConfig: describeGmailConfig(),
    notifyTo: STORE_EMAILS,
    from: process.env.ORDER_FROM_EMAIL?.trim() || null,
    deploymentBranch: process.env.VERCEL_GIT_COMMIT_REF || null,
    deploymentCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
    hint: configured
      ? "A sender is configured. Add ?test=1 to this URL to send a test email."
      : "No sender configured for this deployment — set GMAIL_USER + GMAIL_APP_PASSWORD (or RESEND_API_KEY) under Production, then redeploy.",
  };

  if (url.searchParams.get("test") === "1") {
    report.test = await runTestSend();
  }
  return NextResponse.json(report);
}

/** Sends a diagnostic email and reports the exact outcome per channel. */
async function runTestSend() {
  const subject = "Test email — Allied Book Co. order notifications";
  const text = [
    "This is a test of the order-notification email channel.",
    "",
    `Time: ${new Date().toISOString()}`,
    `Recipients: ${STORE_EMAILS.join(", ")}`,
    "",
    "If you can read this, real customer orders will arrive at this inbox.",
  ].join("\n");
  try {
    const { via } = await sendOrderMail(subject, text, STORE_EMAILS[0], {
      name: "Allied Book Co.",
      email: STORE_EMAILS[0],
      line1: "—",
      city: "—",
      region: "—",
      postal: "—",
      country: "—",
    });
    return { ok: true, via, notifyTo: STORE_EMAILS };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Test email failed",
      failures: (e as { failures?: Failure[] })?.failures ?? [],
      notifyTo: STORE_EMAILS,
      gmailConfig: describeGmailConfig(),
    };
  }
}

export async function POST(request: Request) {
  let body: OrderBody & { test?: boolean };
  try {
    body = (await request.json()) as OrderBody & { test?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // `{ "test": true }` kept for backwards compatibility — same as GET ?test=1.
  if (body?.test === true) {
    const result = await runTestSend();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  if (!body?.items?.length || !body.shipping?.email || !body.shipping?.name) {
    return NextResponse.json(
      { error: "Missing order items or customer details" },
      { status: 400 }
    );
  }

  const subject = `New order from ${body.shipping.name} — Allied Book Co.`;
  // Recompute from the items — never trust the client's payment choice or fee.
  const items = body.items.map((item) => ({
    ...item,
    is_ebook: Boolean(item.is_ebook) || isEbookIsbn(item.isbn),
  }));
  const pricing = cartPricing(
    items.map((i) => ({
      price_cents: i.price_cents,
      quantity: i.quantity,
      is_ebook: i.is_ebook,
    }))
  );
  if (pricing.payment === "upfront" && body.payment_method === "cash_on_delivery") {
    console.error("Order rejected: e-book with cash on delivery");
    return NextResponse.json(
      {
        error:
          "Orders containing an e-book must be paid upfront. Please choose Upfront and try again.",
      },
      { status: 400 }
    );
  }
  const orderBody: OrderBody = {
    ...body,
    items,
    delivery_cents: pricing.deliveryCents,
    total_cents: pricing.totalCents,
    payment_method:
      pricing.payment === "upfront" ? "upfront" : body.payment_method,
  };

  // Server-side truth: an upfront order is only complete with proof of payment.
  if (orderBody.payment_method === "upfront") {
    const parsed = parseScreenshot(body.screenshot);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    orderBody.screenshot = parsed.screenshot;
  } else {
    // Never forward a receipt that belongs to a different payment flow.
    orderBody.screenshot = null;
  }

  // Reduce stock for physical titles. Failures are reported, never silent —
  // and never block the order email (the order itself is still valid).
  const stock = await decrementStockForOrder(
    items.map((i) => ({
      book_id: i.book_id ?? null,
      isbn: i.isbn ?? null,
      quantity: i.quantity,
      is_ebook: i.is_ebook,
    }))
  );
  if (stock.warning) console.error("Stock update problem:", stock.warning);

  const text = buildOrderText(orderBody, stock);
  const replyTo = body.shipping.email;

  try {
    const { via } = await sendOrderMail(
      subject,
      text,
      replyTo,
      body.shipping,
      orderBody.payment_method,
      orderBody.screenshot
    );
    return NextResponse.json({
      ok: true,
      via,
      stock: {
        updated: stock.applied,
        warning: stock.warning ?? null,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not send the order email. Please try again.",
        failures: (e as { failures?: Failure[] })?.failures ?? [],
      },
      { status: 502 }
    );
  }
}

