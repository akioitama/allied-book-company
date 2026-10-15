"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShopResultRow } from "@/components/shop/ShopResultRow";
import {
  ShopFilterBar,
  SORT_OPTIONS,
  filtersToQueryArgs,
  type ShopFilters,
} from "@/components/shop/ShopFilterBar";
import {
  listBooks,
  listCategories,
  type CategoryRecord,
} from "@/lib/books/supabase-books";
import {
  downloadBooksExcel,
  fetchAllMatchingBooks,
} from "@/lib/books/export-excel";
import { SUBJECT_GROUPS } from "@/lib/data/subjects";
import type { Book } from "@/types";

const PAGE_SIZE = 20;

const DEFAULT_FILTERS: ShopFilters = {
  sort: "relevance",
  featured: "all",
  category: "",
  author: "",
  publishDate: "all",
  purchase: "all",
  brand: "all",
};

export function ShopCatalog() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const initialCategory = params.get("category") ?? "";
  const initialAuthor = params.get("author") ?? "";

  const [q, setQ] = useState(initialQ);
  const [filters, setFilters] = useState<ShopFilters>({
    ...DEFAULT_FILTERS,
    category: initialCategory,
    author: initialAuthor,
  });
  const [page, setPage] = useState(1);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shelves, setShelves] = useState<CategoryRecord[]>([]);
  const [exporting, setExporting] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const nextQ = params.get("q") ?? "";
    const nextCategory = params.get("category") ?? "";
    const nextAuthor = params.get("author") ?? "";
    setQ(nextQ);
    setFilters((f) => ({
      ...f,
      category: nextCategory,
      author: nextAuthor,
    }));
    setPage(1);
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((list) => {
        if (!cancelled) setShelves(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const syncParams = (patch: Partial<ShopFilters>) => {
    const next = new URLSearchParams(params.toString());
    if ("category" in patch) {
      const slug = patch.category ?? "";
      if (slug) next.set("category", slug);
      else next.delete("category");
    }
    if ("author" in patch) {
      const author = patch.author?.trim() ?? "";
      if (author) next.set("author", author);
      else next.delete("author");
    }
    router.replace(`/shop?${next.toString()}`, { scroll: false });
  };

  const updateFilters = (patch: Partial<ShopFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
    if ("category" in patch || "author" in patch) {
      syncParams(patch);
    }
  };

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const args = filtersToQueryArgs(filters, q);
      const { books: rows, total: count } = await listBooks({
        ...args,
        page,
        pageSize: PAGE_SIZE,
      });
      if (id !== requestId.current) return;
      setBooks(rows);
      setTotal(count);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : "Could not load catalog");
      setBooks([]);
      setTotal(0);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [filters, q, page]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeSubject =
    SUBJECT_GROUPS.find((g) => g.categorySlug === filters.category)?.name ??
    shelves.find((c) => c.slug === filters.category)?.name;
  const searchTerm = q.trim();
  const authorTerm = filters.author.trim();

  const activeSort = SORT_OPTIONS.find((o) => o.value === filters.sort);

  const exportFilename = () => {
    if (authorTerm) return `books-by-${authorTerm}`;
    if (filters.category) return `books-${filters.category}`;
    if (searchTerm) return `books-search-${searchTerm}`;
    return "allied-shop-books";
  };

  const handleDownloadExcel = async () => {
    if (exporting || total === 0) return;
    setExporting(true);
    try {
      const args = filtersToQueryArgs(filters, q);
      const allBooks = await fetchAllMatchingBooks(args);
      if (allBooks.length === 0) return;
      downloadBooksExcel(allBooks, exportFilename());
    } catch (e) {
      console.error("Excel export failed", e);
      setError(
        e instanceof Error ? e.message : "Could not download Excel file"
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <ShopFilterBar
        filters={filters}
        onChange={updateFilters}
      />

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-body text-base text-[#374151]">
            {loading ? (
              "Loading results…"
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-[#111827]">
                  {total.toLocaleString()}
                </span>{" "}
                result{total === 1 ? "" : "s"}
                {searchTerm ? (
                  <>
                    {" "}
                    for &ldquo;
                    <span className="font-semibold text-[#111827]">
                      {searchTerm}
                    </span>
                    &rdquo;
                  </>
                ) : null}
                {authorTerm ? (
                  <>
                    {" "}
                    by{" "}
                    <span className="font-semibold text-[#111827]">
                      {authorTerm}
                    </span>
                  </>
                ) : null}
                {" in "}
                <span className="font-semibold text-[#111827]">
                  {activeSubject ? activeSubject : "Books"}
                </span>
                {activeSort ? (
                  <>
                    {" "}
                    · sorted by{" "}
                    <span className="font-semibold text-[#111827]">
                      {activeSort.label}
                    </span>
                  </>
                ) : null}
              </>
            )}
          </p>

          <button
            type="button"
            disabled={loading || exporting || total === 0}
            onClick={() => void handleDownloadExcel()}
            className="label-caps inline-flex items-center gap-2 border border-[#1E3A8A] bg-[#1E3A8A] px-4 py-2.5 text-[0.65rem] text-white transition hover:bg-[#172554] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {exporting ? "Preparing…" : "Download Excel"}
          </button>
        </div>

        {error && (
          <p className="mt-6 font-body text-lg text-oxblood">{error}</p>
        )}

        <div className="mt-6 space-y-4">
          {loading ? (
            Array.from({ length: 6 }, (_, i) => (
              <ShopResultRow.Skeleton key={i} />
            ))
          ) : !error && books.length === 0 ? (
            <p className="font-body text-lg text-[#6B7280]">
              No titles match. Try another search or adjust the filters.
            </p>
          ) : (
            books.map((book) => (
              <ShopResultRow key={book.id} book={book} />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="label-caps border border-[#D1D5DB] px-4 py-2 text-[0.65rem] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-body text-sm text-[#6B7280]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="label-caps border border-[#D1D5DB] px-4 py-2 text-[0.65rem] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
