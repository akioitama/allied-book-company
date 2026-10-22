"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SUBJECT_GROUPS } from "@/lib/data/subjects";
import { cn } from "@/lib/utils";

type Option = {
  value: string;
  label: string;
};

type FilterDropdownProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
  menuClassName?: string;
  children?: ReactNode;
};

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  className,
  menuClassName,
  children,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.value === value);
  const display =
    active && active.value !== "" && active.value !== "all"
      ? `${label}: ${active.label}`
      : label;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Defer so the opening click doesn't immediately close the menu.
    const t = window.setTimeout(() => {
      document.addEventListener("click", onClick);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent py-3 font-body text-sm text-[#374151] transition hover:text-[#111827]",
          open && "border-oxblood text-[#111827]",
          active && active.value !== "" && active.value !== "all" && "text-[#111827]"
        )}
      >
        <span className="inline-flex translate-y-[2px] items-center gap-1.5">
          {display}
          <svg
            viewBox="0 0 24 24"
            className={cn("h-3.5 w-3.5 transition", open && "rotate-180")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-1 max-h-72 min-w-[12rem] overflow-y-auto rounded border border-[#E5E7EB] bg-white py-1 shadow-lg",
            menuClassName
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {children ?? (
            <ul>
              {options.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "block w-full px-4 py-2 text-left font-body text-sm transition hover:bg-[#F3F4F6]",
                      value === opt.value
                        ? "bg-[#EFF6FF] font-medium text-oxblood"
                        : "text-[#374151]"
                    )}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export type ShopFilters = {
  sort: string;
  featured: string;
  category: string;
  author: string;
  publishDate: string;
  purchase: string;
  brand: string;
};

type Props = {
  filters: ShopFilters;
  onChange: (patch: Partial<ShopFilters>) => void;
};

export const SORT_OPTIONS: Option[] = [
  { value: "relevance", label: "Relevance" },
  { value: "title", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
  { value: "newest", label: "New to Old" },
  { value: "oldest", label: "Old to New" },
];

const PURCHASE_OPTIONS: Option[] = [
  { value: "all", label: "All options" },
  { value: "in_stock", label: "In stock" },
  { value: "on_sale", label: "On sale" },
];

export function ShopFilterBar({ filters, onChange }: Props) {
  const subjectOptions: Option[] = [
    { value: "", label: "All subjects" },
    ...SUBJECT_GROUPS.filter((g) => g.categorySlug).map((g) => ({
      value: g.categorySlug!,
      label: g.name,
    })),
  ];

  return (
    <div className="relative z-30 border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mt-[2px] flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
        <FilterDropdown
          label="Sort By"
          value={filters.sort}
          options={SORT_OPTIONS}
          onChange={(sort) => onChange({ sort })}
        />
        <FilterDropdown
          label="Subjects"
          value={filters.category}
          options={subjectOptions}
          onChange={(category) => onChange({ category })}
        />
        <FilterDropdown
          label="Author"
          value={filters.author ? "custom" : "all"}
          options={[
            { value: "all", label: "All authors" },
            { value: "custom", label: filters.author || "Search author…" },
          ]}
          onChange={() => undefined}
        >
          <div className="p-3">
            <label className="sr-only" htmlFor="author-filter">
              Author
            </label>
            <input
              id="author-filter"
              value={filters.author}
              onChange={(e) => onChange({ author: e.target.value })}
              placeholder="Type author name…"
              className="w-full min-w-[10rem] border border-[#D1D5DB] px-3 py-2 font-body text-sm outline-none focus:border-oxblood"
            />
          </div>
        </FilterDropdown>
        <FilterDropdown
          label="Purchase Option"
          value={filters.purchase}
          options={PURCHASE_OPTIONS}
          onChange={(purchase) => onChange({ purchase })}
        />
        <FilterDropdown
          label="Brand"
          value={filters.brand ? "custom" : "all"}
          options={[
            { value: "all", label: "All brands" },
            { value: "custom", label: filters.brand || "Search brand…" },
          ]}
          onChange={() => undefined}
          menuClassName="min-w-[22rem] w-[22rem]"
        >
          <div className="p-3">
            <label className="sr-only" htmlFor="brand-filter">
              Brand
            </label>
            <input
              id="brand-filter"
              value={filters.brand === "all" ? "" : filters.brand}
              onChange={(e) => onChange({ brand: e.target.value })}
              placeholder="Type brand / publisher…"
              className="w-full border border-[#D1D5DB] px-3 py-2 font-body text-sm outline-none focus:border-oxblood"
            />
          </div>
        </FilterDropdown>
        </div>
      </div>
    </div>
  );
}

export function filtersToQueryArgs(filters: ShopFilters, q: string) {
  let orderBy:
    | "title"
    | "created_at"
    | "stock"
    | "price_cents"
    | "published_at"
    | "publish_year"
    | "discount_percent" = "title";
  let ascending = true;

  switch (filters.sort) {
    case "relevance":
      orderBy = "title";
      ascending = true;
      break;
    case "title_desc":
      orderBy = "title";
      ascending = false;
      break;
    case "newest":
      orderBy = "publish_year";
      ascending = false;
      break;
    case "oldest":
      orderBy = "publish_year";
      ascending = true;
      break;
    default:
      orderBy = "title";
      ascending = true;
  }

  let publishYearMin: number | undefined;
  let publishAfter: string | undefined;
  const now = new Date();
  const currentYear = now.getFullYear();

  if (filters.publishDate === "12m") {
    publishYearMin = currentYear - 1;
    publishAfter = new Date(
      currentYear - 1,
      now.getMonth(),
      now.getDate()
    )
      .toISOString()
      .slice(0, 10);
  } else if (filters.publishDate === "3y") {
    publishYearMin = currentYear - 2;
    publishAfter = `${currentYear - 2}-01-01`;
  } else if (filters.publishDate === "5y") {
    publishYearMin = currentYear - 4;
    publishAfter = `${currentYear - 4}-01-01`;
  }

  const featured = filters.featured;
  const purchase = filters.purchase;

  const brand = filters.brand.trim();
  const brandQuery =
    brand && brand.toLowerCase() !== "all" ? brand : undefined;

  return {
    q: q || undefined,
    author: filters.author.trim() || undefined,
    brand: brandQuery,
    category: filters.category || undefined,
    orderBy,
    ascending,
    relevanceSort: filters.sort === "relevance" && Boolean(q.trim()),
    featured: featured === "featured" ? true : undefined,
    isNew: featured === "new" ? true : undefined,
    bestseller: featured === "bestseller" ? true : undefined,
    onSale:
      featured === "sale" || purchase === "on_sale" ? true : undefined,
    inStock: purchase === "in_stock" ? true : undefined,
    publishYearMin,
    publishAfter,
  };
}
