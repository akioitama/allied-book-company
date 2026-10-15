import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
  id?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
  id,
}: Props) {
  return (
    <div
      id={id}
      className={cn(
        "mb-10 max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="font-display text-3xl text-ink md:text-4xl text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 font-body text-lg text-ink-soft leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
