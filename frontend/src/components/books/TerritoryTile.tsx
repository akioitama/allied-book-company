import Link from "next/link";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  category: Category;
  index?: number;
  className?: string;
  interactive?: boolean;
};

export function TerritoryTile({
  category,
  index = 0,
  className,
  interactive = true,
}: Props) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="font-label text-[0.65rem] uppercase tracking-[0.2em] text-brass">
          Territory {String(index + 1).padStart(2, "0")}
        </span>
        <span className="font-display text-2xl italic text-oxblood">
          {category.coordinate_label}
        </span>
      </div>
      <h3 className="mt-6 font-display text-2xl text-ink md:text-[1.7rem]">
        {category.name}
      </h3>
      <p className="mt-3 font-body text-ink-soft leading-relaxed">
        {category.description}
      </p>
      <span className="mt-6 inline-flex items-center gap-2 font-label text-[0.62rem] uppercase tracking-[0.18em] text-forest opacity-0 transition group-hover:opacity-100 motion-reduce:opacity-100">
        Enter territory
        <span aria-hidden>→</span>
      </span>
    </>
  );

  const classes = cn(
    "group relative map-panel overflow-hidden p-6 transition duration-500",
    "before:pointer-events-none before:absolute before:inset-0 before:bg-map-grid before:bg-map-grid before:opacity-40",
    interactive && "hover:-translate-y-2 hover:border-oxblood/45 hover:shadow-lift",
    "motion-reduce:transform-none",
    className
  );

  if (!interactive) {
    return <div className={classes}>{content}</div>;
  }

  return (
    <Link href={`/shop?category=${category.slug}`} className={classes}>
      {content}
    </Link>
  );
}
