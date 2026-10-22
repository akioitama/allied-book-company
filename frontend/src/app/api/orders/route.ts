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

/** Where order emails are delivered (testing inbox for now). */
const STORE_EMAIL =
  process.env.ORDER_NOTIFY_EMAIL?.trim() || "info@alliedbook.com";

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
async function sendViaGmail(subject: string, text: string, replyTo: string) {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) return false;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Allied Book Co." <${user}>`,
    to: STORE_EMAIL,
    replyTo,
    subject,
    text,
  });
  return true;
}

async function sendViaResend(subject: string, text: string, replyTo: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;

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
      to: [STORE_EMAIL],
      reply_to: replyTo,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend order email failed", err);
    throw new Error("Could not send order email via Resend");
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
  const res = await fetch(`https://formsubmit.co/ajax/${STORE_EMAIL}`, {
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
  });

  const raw = await res.text();
  let data: { success?: string | boolean; message?: string } = {};
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    /* ignore */
  }

  if (!res.ok || data.success === false || data.success === "false") {
    console.error("FormSubmit order email failed", raw);
    throw new Error(
      data.message ||
        "Could not send order email. Check spam for a FormSubmit activation link, or set GMAIL_APP_PASSWORD."
    );
  }
  return true;
}

export async function POST(request: Request) {
  let body: OrderBody;
  try {
    body = (await request.json()) as OrderBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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
    if (await sendViaGmail(subject, text, replyTo)) {
      return NextResponse.json({ ok: true, via: "gmail" });
    }
    if (await sendViaResend(subject, text, replyTo)) {
      return NextResponse.json({ ok: true, via: "resend" });
    }
    await sendViaFormSubmit(
      subject,
      text,
      body.shipping,
      body.payment_method
    );
    return NextResponse.json({ ok: true, via: "formsubmit" });
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
