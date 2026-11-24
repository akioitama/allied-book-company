import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { formatPrice } from "@/lib/utils";

export const runtime = "nodejs";

type OrderItem = {
  title: string;
  author?: string;
  quantity: number;
  price_cents: number;
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
  subtotal_cents?: number;
  delivery_cents?: number;
  total_cents: number;
};

function paymentLabel(method?: string) {
  if (method === "upfront") return "Upfront";
  if (method === "cash_on_delivery") return "Cash on delivery";
  return method?.trim() || "Not specified";
}

/** Where order emails are delivered. Comma-separated for multiple inboxes. */
const STORE_EMAIL =
  process.env.ORDER_NOTIFY_EMAIL?.trim() || "info@alliedbook.com";

const STORE_EMAILS = STORE_EMAIL.split(",")
  .map((e) => e.trim())
  .filter(Boolean);

function buildOrderText(body: OrderBody): string {
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

  const subtotal =
    body.subtotal_cents != null
      ? body.subtotal_cents
      : body.total_cents - (body.delivery_cents ?? 0);
  const delivery = body.delivery_cents ?? 0;

  lines.push(
    "",
    `Subtotal: ${formatPrice(subtotal)}`,
    `Delivery: ${delivery > 0 ? formatPrice(delivery) : "Free"}`,
    `Total: ${formatPrice(body.total_cents)}`,
    `Payment method: ${paymentLabel(body.payment_method)}`,
    "",
    "Please contact the customer to confirm payment / delivery."
  );

  return lines.join("\n");
}

/** Preferred: Gmail SMTP with an App Password (most reliable for testing). */
async function sendViaGmail(
  subject: string,
  text: string,
  replyTo: string,
  to: string[]
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
  });
  return true;
}

async function sendViaResend(
  subject: string,
  text: string,
  replyTo: string,
  to: string[]
) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;

  // Resend requires a verified domain (or onboarding@resend.dev for testing).
  const from =
    process.env.ORDER_FROM_EMAIL?.trim() ||
    "Allied Book Co. <onboarding@resend.dev>";

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
  paymentMethod?: string
): Promise<{ via: string; failures: Failure[] }> {
  const failures: Failure[] = [];

  try {
    if (await sendViaGmail(subject, text, replyTo, STORE_EMAILS)) {
      return { via: "gmail", failures };
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error("Gmail send failed", reason);
    failures.push({ channel: "gmail", reason });
  }

  try {
    if (await sendViaResend(subject, text, replyTo, STORE_EMAILS)) {
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
  const text = buildOrderText(body);
  const replyTo = body.shipping.email;

  try {
    const { via } = await sendOrderMail(
      subject,
      text,
      replyTo,
      body.shipping,
      body.payment_method
    );
    return NextResponse.json({ ok: true, via });
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

