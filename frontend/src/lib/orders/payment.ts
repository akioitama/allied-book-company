/**
 * Where customers send an upfront payment.
 *
 * Kept dependency-free and in one place so the checkout screen, the order
 * email and the success page can never drift apart.
 *
 * ── ADMIN: edit the account details here ────────────────────────────────────
 * The real numbers must NOT be guessed. Either set the matching
 * `NEXT_PUBLIC_PAY_*` environment variables (Vercel → Settings → Environment
 * Variables, no redeploy needed for a preview but a rebuild is required), or
 * replace the `value` strings below with the real details and redeploy.
 *
 * While a value still holds its `PLACEHOLDER_*` token the checkout shows it as
 * "To be confirmed", so a customer is never told to send money to a fake
 * account, and the store email lists every missing field for the team.
 */

/** A value the admin has not filled in yet. */
export const PLACEHOLDER_PREFIX = "PLACEHOLDER_";

/** Read an admin-provided value, keeping the placeholder when it is unset. */
function setting(envName: string, placeholder: string): string {
  const value =
    typeof process !== "undefined" && process.env
      ? process.env[envName]?.trim()
      : "";
  return value || placeholder;
}

/** True when a detail is still a placeholder and must not be shown as real. */
export function isPlaceholder(value?: string | null): boolean {
  return !value || value.trim().startsWith(PLACEHOLDER_PREFIX);
}

export type PaymentOptionId =
  | "jazzcash"
  | "easypaisa"
  | "hbl_bank_transfer";

/** Display label used in the order email. */
function bankLabel(bank?: string | null): string {
  return bank?.trim() || "Bank";
}

export type PaymentOption = {
  /** Internal id stored on the order (`payment_account`). */
  id: PaymentOptionId;
  /** Customer-facing name of the channel. */
  title: string;
  /** Short line under the title. */
  subtitle: string;
  /** Label/value rows exactly as they should be read out. */
  rows: { label: string; value: string; copyable?: boolean }[];
  /** Logo file in /public — omitted when no logo asset exists. */
  logo?: string;
};

/** Shown above the payment methods on the checkout screen. */
export const PAYMENT_INSTRUCTIONS =
  "Please pay using any one of the following payment methods and upload a screenshot of your payment receipt to confirm your order.";

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "jazzcash",
    title: "JazzCash",
    subtitle: "Send the amount to this JazzCash account",
    logo: "/payments/jazzcash.svg",
    rows: [
      {
        label: "Account Title",
        value: setting("NEXT_PUBLIC_PAY_JAZZCASH_TITLE", "Nasrullah"),
      },
      {
        label: "Account No.",
        value: setting("NEXT_PUBLIC_PAY_JAZZCASH_NUMBER", "03028414014"),
        copyable: true,
      },
    ],
  },
  {
    id: "easypaisa",
    title: "Easypaisa",
    subtitle: "Send the amount to this Easypaisa account",
    logo: "/payments/easypaisa.svg",
    rows: [
      {
        label: "Account Title",
        value: setting("NEXT_PUBLIC_PAY_EASYPAISA_TITLE", "Nasrullah"),
      },
      {
        label: "Account No.",
        value: setting("NEXT_PUBLIC_PAY_EASYPAISA_NUMBER", "03028414014"),
        copyable: true,
      },
    ],
  },
  {
    // The account is at Habib Metropolitan Bank — the title and subtitle are
    // derived from the configured bank so they can never name a different bank.
    id: "hbl_bank_transfer",
    title: `${bankLabel(
      setting("NEXT_PUBLIC_PAY_BANK", "Habib Metropolitan Bank")
    )} Bank Transfer`,
    subtitle: `Transfer the amount to our ${setting(
      "NEXT_PUBLIC_PAY_BANK",
      "Habib Metropolitan Bank"
    )} account`,
    logo: "/payments/habib-metro.svg",
    rows: [
      {
        label: "Bank",
        value: setting("NEXT_PUBLIC_PAY_BANK", "Habib Metropolitan Bank"),
      },
      {
        label: "Branch",
        value: setting(
          "NEXT_PUBLIC_PAY_BANK_BRANCH",
          "Shahrah-e-Quaid-e-Azam Branch, Lahore"
        ),
      },
      {
        label: "Branch Code",
        value: setting("NEXT_PUBLIC_PAY_BANK_BRANCH_CODE", "0284"),
        copyable: true,
      },
      {
        label: "Account Title",
        value: setting("NEXT_PUBLIC_PAY_BANK_TITLE", "ALLIED BOOK CO."),
      },
      {
        label: "Account No.",
        value: setting("NEXT_PUBLIC_PAY_BANK_NUMBER", "06714015 5471"),
        copyable: true,
      },
      {
        // 24 characters, verified against the ISO 13616 mod-97 checksum.
        label: "IBAN",
        value: setting("NEXT_PUBLIC_PAY_BANK_IBAN", "PK79MPBL0284067140155471"),
        copyable: true,
      },
    ],
  },
];

/** Label for an option id, used in the order email ("JazzCash"). */
export function paymentOptionLabel(id?: string | null): string {
  return PAYMENT_OPTIONS.find((o) => o.id === id)?.title ?? "";
}

/** Details still waiting to be filled in — surfaced to the store, not customers. */
export function pendingPaymentDetails(): string[] {
  const missing: string[] = [];
  for (const option of PAYMENT_OPTIONS) {
    for (const row of option.rows) {
      if (isPlaceholder(row.value)) missing.push(`${option.title} ${row.label}`);
    }
  }
  return missing;
}

/**
 * Upload rules for the payment screenshot. Mirrored in `POST /api/orders`,
 * which re-validates everything server-side.
 */
export const SCREENSHOT_MAX_BYTES = 4 * 1024 * 1024;
export const SCREENSHOT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
] as const;

/** Human-readable list for error messages ("JPG, PNG, WebP, HEIC or GIF"). */
export const SCREENSHOT_TYPE_LABEL = "JPG, PNG, WebP, HEIC or GIF";

/** Order numbers look like `ABC-8F3K2QW1`. */
const ORDER_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Short, unambiguous, copy-friendly order number. Avoids 0/O and 1/I so a
 * customer reading it over the phone cannot confuse the characters.
 */
export function createOrderNumber(now: Date = new Date()): string {
  const bytes = new Uint8Array(8);
  const cryptoApi =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let code = "";
  for (let i = 0; i < bytes.length; i += 1) {
    code += ORDER_ID_ALPHABET[bytes[i] % ORDER_ID_ALPHABET.length];
  }
  const year = String(now.getFullYear()).slice(-2);
  return `ABC-${year}${code}`;
}
