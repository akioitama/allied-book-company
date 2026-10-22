import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
};

export function EmptyState({ title, body, ctaHref, ctaLabel, className }: Props) {
  return (
    <div
      className={cn(
        "map-panel mx-auto flex max-w-lg flex-col items-center px-8 py-14 text-center",
        className
      )}
    >
      <div className="inline-flex rounded-full bg-[#EFF6FF] p-4 ring-1 ring-[#BFDBFE]">
        <Image
          src="/logo.png"
          alt="Allied Book Co."
          width={96}
          height={88}
          className="h-16 w-auto md:h-20"
        />
      </div>
      <h2 className="mt-6 font-display text-2xl text-ink">{title}</h2>
      <p className="mt-3 font-body text-ink-soft leading-relaxed">{body}</p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="label-caps mt-8 border border-oxblood bg-oxblood px-5 py-3 text-[0.7rem] text-parchment transition hover:bg-ink"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
