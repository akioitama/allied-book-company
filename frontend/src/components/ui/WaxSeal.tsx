import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  pressed?: boolean;
};

export function WaxSeal({
  size = "md",
  label = "ABC",
  className,
  pressed,
}: Props) {
  const dim =
    size === "sm"
      ? "h-12 w-12 text-[0.55rem]"
      : size === "lg"
        ? "h-24 w-24 text-sm"
        : "h-16 w-16 text-xs";

  return (
    <div
      className={cn(
        "grid place-items-center rounded-full bg-oxblood text-white shadow-seal",
        "border-[3px] border-white/30 ring-2 ring-brass-light/50 ring-offset-2 ring-offset-parchment",
        pressed && "animate-seal-press",
        dim,
        className
      )}
      aria-hidden
    >
      <span className="font-label uppercase tracking-[0.14em]">{label}</span>
    </div>
  );
}
