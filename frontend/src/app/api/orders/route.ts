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
    console.error("FormSubmit order email failed", raw);
    // FormSubmit reports transient failures as HTTP 200 + {"message":"Server Error"}.
    const transient = /server error|try again|unavailable/i.test(
      `${data.message || ""} ${raw}`
    );
    throw new Error(
      transient
        ? "The email relay is temporarily unavailable. Please place the order again in a minute, or message us on WhatsApp."
        : "No email provider is configured and the fallback relay refused the order. " +
            "Set GMAIL_USER + GMAIL_APP_PASSWORD (or RESEND_API_KEY) in the deployment environment."
    );
  }
  return true;
}

/** True when at least one authenticated sender is configured. */
function serverMailConfigured() {
  const gmail =
    Boolean(process.env.GMAIL_USER?.trim()) &&
    Boolean(process.env.GMAIL_APP_PASSWORD?.trim());
  return gmail || Boolean(process.env.RESEND_API_KEY?.trim());
}

async function sendOrderMail(
  subject: string,
  text: string,
  replyTo: string,
  shipping: OrderBody["shipping"],
  paymentMethod?: string
): Promise<{ via: string }> {
  if (await sendViaGmail(subject, text, replyTo, STORE_EMAILS)) {
    return { via: "gmail" };
  }
  // Gmail failures throw (surfacing the SMTP error), so this only runs when
  // Gmail is not configured at all.
  if (await sendViaResend(subject, text, replyTo, STORE_EMAILS)) {
    return { via: "resend" };
  }
  await sendViaFormSubmit(subject, text, shipping, paymentMethod);
  return { via: "formsubmit" };
}

/** Status check: `GET /api/orders` reports which email channel is configured. */
export async function GET() {
  const gmail =
    Boolean(process.env.GMAIL_USER?.trim()) &&
    Boolean(process.env.GMAIL_APP_PASSWORD?.trim());
  const resend = Boolean(process.env.RESEND_API_KEY?.trim());
  return NextResponse.json({
    ok: serverMailConfigured(),
    gmail,
    resend,
    formsubmitFallback: true,
    notifyTo: STORE_EMAILS,
    from: process.env.ORDER_FROM_EMAIL?.trim() || null,
    hint:
      gmail || resend
        ? "Authenticated sender configured. POST { \"test\": true } to send a test email."
        : "No authenticated sender configured — set GMAIL_USER + GMAIL_APP_PASSWORD or RESEND_API_KEY in the host environment, then redeploy.",
  });
}

export async function POST(request: Request) {
  let body: OrderBody & { test?: boolean };
  try {
    body = (await request.json()) as OrderBody & { test?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // `{ "test": true }` sends a diagnostic email so the live deployment can be
  // verified from outside (GET /api/orders tells you what is configured).
  if (body?.test === true) {
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
      return NextResponse.json({
        ok: true,
        via,
        notifyTo: STORE_EMAILS,
        warning:
          via === "formsubmit"
            ? "No authenticated sender configured; used the free FormSubmit relay (needs activation, may be delayed or blocked)."
            : undefined,
      });
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        {
          ok: false,
          error: e instanceof Error ? e.message : "Test email failed",
          notifyTo: STORE_EMAILS,
          serverMailConfigured: serverMailConfigured(),
        },
        { status: 502 }
      );
    }
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
      },
      { status: 502 }
    );
  }
}

