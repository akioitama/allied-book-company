"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  alt: string;
  title?: string;
  sizes?: string;
  priority?: boolean;
  fallbackSrcs?: Array<string | null | undefined>;
  className?: string;
  imageClassName?: string;
};

/**
 * Detect "no cover" responses that arrive as valid images:
 * - Open Library without default=false returns a 1x1 blank gif.
 * - Google Books returns a 128x170 near-white stub (fife upscaling is
 *   ignored for the stub, so its dimensions are stable).
 */
function looksLikeMissingCover(img: HTMLImageElement, src: string) {
  if (img.naturalWidth <= 1 || img.naturalHeight <= 1) return true;
  if (
    src.includes("books.google") &&
    img.naturalWidth === 128 &&
    img.naturalHeight === 170
  ) {
    return true;
  }
  return false;
}

export function BookCover({
  src,
  alt,
  title,
  sizes = "(max-width:768px) 50vw, 25vw",
  priority,
  fallbackSrcs,
  className,
  imageClassName,
}: Props) {
  // Stabilize identity so parent re-renders don't reset the fallback index.
  const sourceKey = [src, ...(fallbackSrcs ?? [])].filter(Boolean).join("|");

  const sources = useMemo(
    () =>
      sourceKey
        ? sourceKey
            .split("|")
            .filter((value, index, arr) => arr.indexOf(value) === index)
        : [],
    [sourceKey]
  );

  const [sourceIndex, setSourceIndex] = useState(0);
  const advancing = useRef(false);

  useEffect(() => {
    setSourceIndex(0);
    advancing.current = false;
  }, [sourceKey]);

  const activeSrc = sources[sourceIndex] ?? null;
  const hasCover = Boolean(activeSrc);

  function advance(reason: string) {
    if (advancing.current) return;
    advancing.current = true;
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        `[BookCover] source ${sourceIndex + 1}/${sources.length} failed (${reason}): ${activeSrc}`
      );
    }
    setSourceIndex((current) => {
      const next = current + 1;
      // Allow another advance once the next image mounts.
      queueMicrotask(() => {
        advancing.current = false;
      });
      return next;
    });
  }

  return (
    <div
      className={cn(
        "book-cover relative h-full w-full overflow-hidden bg-[#EFF6FF]",
        className
      )}
    >
      {hasCover ? (
        <Image
          key={activeSrc}
          src={activeSrc as string}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          quality={80}
          // Google query-string URLs and storage objects are already sized;
          // skipping the optimizer avoids intermittent upstream failures that
          // used to cascade into the empty placeholder.
          unoptimized={
            Boolean(activeSrc) &&
            (activeSrc!.includes("books.google") ||
              activeSrc!.includes("supabase.co") ||
              activeSrc!.includes("openlibrary.org"))
          }
          className={cn("book-cover__img", imageClassName)}
          onError={() => advance("load error")}
          onLoad={(event) => {
            const img = event.currentTarget;
            if (looksLikeMissingCover(img, activeSrc as string)) {
              advance("missing-cover stub");
            }
          }}
        />
      ) : (
        <CoverPlaceholder title={title} />
      )}
    </div>
  );
}

function CoverPlaceholder({ title }: { title?: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4"
      style={{
        background:
          "radial-gradient(ellipse at 30% 20%, rgba(37,99,235,0.2), transparent 55%), linear-gradient(180deg, #FFFFFF, #EFF6FF)",
      }}
      aria-hidden={!title}
    >
      <svg viewBox="0 0 64 64" className="relative z-10 h-14 w-14" aria-hidden>
        <circle cx="32" cy="32" r="28" fill="none" stroke="#2563EB" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="18" fill="none" stroke="#93C5FD" strokeWidth="1.25" />
        <path d="M32 8v48M8 32h48" stroke="#1E3A8A" strokeWidth="1" opacity="0.7" />
        <polygon points="32,12 34.5,32 32,36 29.5,32" fill="#2563EB" />
        <circle cx="32" cy="32" r="3" fill="#93C5FD" />
      </svg>
      <span className="relative z-10 font-label text-[0.58rem] uppercase tracking-[0.22em] text-[#2563EB]">
        Cover uncharted
      </span>
      {title && (
        <span className="relative z-10 line-clamp-3 max-w-[12rem] text-center font-display text-sm italic text-[#334155]">
          {title}
        </span>
      )}
    </div>
  );
}
