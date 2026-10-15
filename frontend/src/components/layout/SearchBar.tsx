"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchBooksSuggest } from "@/lib/books/supabase-books";
import type { Book } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  transparent?: boolean;
  className?: string;
};

export function SearchBar({ transparent, className }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(() => {
      void searchBooksSuggest(query, 5)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(t);
  }, [q]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const query = q.trim();
    setOpen(false);
    if (!query) {
      router.push("/shop");
      return;
    }
    router.push(`/shop?q=${encodeURIComponent(query)}`);
  }

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <form onSubmit={submit} role="search">
        <label htmlFor="site-search" className="sr-only">
          Search books
        </label>
        <div
          className={cn(
            "flex items-center gap-2 border px-3 py-2 transition",
            transparent
              ? "border-white/40 bg-white/10 text-white focus-within:border-white"
              : "border-brass/60 bg-white text-ink focus-within:border-oxblood"
          )}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 opacity-70"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            id="site-search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search titles or authors…"
            className={cn(
              "w-full bg-transparent font-body text-sm outline-none",
              transparent
                ? "placeholder:text-white/55"
                : "placeholder:text-ink-soft/60"
            )}
            autoComplete="off"
          />
          <button
            type="submit"
            className={cn(
              "label-caps shrink-0 text-[0.58rem] transition",
              transparent
                ? "text-white/80 hover:text-white"
                : "text-oxblood hover:text-forest"
            )}
          >
            Go
          </button>
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto border border-brass/50 bg-white py-1 shadow-lift"
          role="listbox"
        >
          {suggestions.map((book) => (
            <li key={book.id}>
              <Link
                href={`/shop/${book.slug}`}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 transition hover:bg-parchment-deep"
              >
                <span className="block font-display text-sm text-ink">
                  {book.title}
                </span>
                <span className="block font-body text-xs text-ink-soft">
                  {book.author}
                </span>
              </Link>
            </li>
          ))}
          <li className="border-t border-brass/30">
            <button
              type="button"
              onClick={() => submit()}
              className="w-full px-3 py-2.5 text-left font-label text-[0.62rem] uppercase tracking-[0.16em] text-oxblood hover:bg-parchment-deep"
            >
              See all results for &ldquo;{q.trim()}&rdquo;
            </button>
          </li>
        </ul>
      )}

      {open && q.trim().length >= 2 && !searching && suggestions.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 border border-brass/50 bg-white px-3 py-3 font-body text-sm text-ink-soft shadow-lift">
          No titles match &ldquo;{q.trim()}&rdquo;. Try another word.
        </div>
      )}
    </div>
  );
}
