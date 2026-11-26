"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_MIME_TYPES,
  SCREENSHOT_TYPE_LABEL,
} from "@/lib/orders/payment";
import { cn } from "@/lib/utils";

type Props = {
  /** Currently attached receipt, if any. */
  file: File | null;
  onChange: (file: File | null) => void;
  /** Show the red "required" styling (e.g. after a failed place-order attempt). */
  showError?: boolean;
  disabled?: boolean;
};

const ACCEPT = SCREENSHOT_MIME_TYPES.join(",");

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Mirrors the server-side rules in `POST /api/orders`. */
function validate(file: File): string | null {
  if (!(SCREENSHOT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `That file type is not supported. Please upload a ${SCREENSHOT_TYPE_LABEL} image of your receipt.`;
  }
  if (file.size > SCREENSHOT_MAX_BYTES) {
    return `That image is ${formatBytes(file.size)}. Please upload one under ${formatBytes(
      SCREENSHOT_MAX_BYTES
    )}.`;
  }
  return null;
}

export function PaymentScreenshotField({
  file,
  onChange,
  showError,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Object URL preview; revoked when the file changes or the field unmounts.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function accept(selected: File | null | undefined) {
    if (!selected) return;
    const problem = validate(selected);
    if (problem) {
      setError(problem);
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError(null);
    onChange(selected);
  }

  function clear() {
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const missing = showError && !file && !error;

  return (
    <div>
      <label htmlFor={inputId} className="eyebrow block">
        Payment receipt screenshot <span className="text-oxblood">*</span>
      </label>
      <p className="mt-1 font-body text-sm text-ink-soft">
        Attach a clear screenshot of the payment confirmation. {SCREENSHOT_TYPE_LABEL},
        up to {formatBytes(SCREENSHOT_MAX_BYTES)}.
      </p>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        disabled={disabled}
        required
        onChange={(e) => accept(e.target.files?.[0])}
        className="sr-only"
      />

      {file && previewUrl ? (
        <div
          className={cn(
            "mt-3 flex items-center gap-4 border bg-parchment-deep p-3",
            error ? "border-oxblood" : "border-forest/40"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, never downloaded */}
          <img
            src={previewUrl}
            alt="Selected payment receipt"
            className="h-20 w-20 shrink-0 border border-brass/40 bg-white object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-body text-sm text-ink" title={file.name}>
              {file.name}
            </p>
            <p className="mt-0.5 font-body text-xs text-ink-soft">
              {formatBytes(file.size)} · ready to send
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="label-caps text-[0.62rem] text-oxblood hover:underline disabled:opacity-50"
              >
                Replace
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={clear}
                className="label-caps text-[0.62rem] text-ink-soft hover:text-oxblood hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-2 border border-dashed px-4 py-6 font-body text-sm transition disabled:opacity-60",
            missing || error
              ? "border-oxblood bg-oxblood/5 text-oxblood"
              : "border-brass/60 bg-parchment text-ink-soft hover:border-oxblood hover:text-oxblood"
          )}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden
          >
            <path
              d="M12 16V4m0 0L7 9m5-5l5 5M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Upload payment screenshot
        </button>
      )}

      {error ? (
        <p className="mt-2 font-body text-sm text-oxblood" role="alert">
          {error}
        </p>
      ) : missing ? (
        <p className="mt-2 font-body text-sm text-oxblood" role="alert">
          Please upload your payment screenshot to place this order.
        </p>
      ) : null}
    </div>
  );
}
