/**
 * Where customers send an upfront payment.
 *
 * Kept dependency-free and in one place so the checkout screen, the order
 * email and the success page can never drift apart. Update the details here
 * and every surface follows.
 */

export type PaymentOption = {
  /** Internal id stored on the order (`payment_account`). */
  id: "jazzcash_easypaisa" | "bank_transfer";
  /** Customer-facing name of the channel. */
  title: string;
  /** Short line under the title. */
  subtitle: string;
  /** Label/value rows exactly as they should be read out. */
  rows: { label: string; value: string; copyable?: boolean }[];
};

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "jazzcash_easypaisa",
    title: "JazzCash / EasyPaisa",
    subtitle: "Send to this mobile account number",
    rows: [
      { label: "Account Title", value: "Nasrullah" },
      { label: "Account No.", value: "03028414014", copyable: true },
    ],
  },
  {
    id: "bank_transfer",
    title: "Bank Transfer",
    subtitle: "Habib Metropolitan Bank",
    rows: [
      { label: "Bank Name", value: "Habib Metropolitan Bank" },
      { label: "Account Name", value: "Allied Book Co." },
      {
        label: "IBAN",
        value: "PK79MPBL0284067140155471",
        copyable: true,
      },
    ],
  },
];

/** Label for an option id, used in the order email ("JazzCash / EasyPaisa"). */
export function paymentOptionLabel(id?: string | null): string {
  return PAYMENT_OPTIONS.find((o) => o.id === id)?.title ?? "";
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
