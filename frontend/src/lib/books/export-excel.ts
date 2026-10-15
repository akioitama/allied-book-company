import * as XLSX from "xlsx";
import type { Book } from "@/types";
import { listBooks, type ListBooksOpts } from "@/lib/books/supabase-books";

const BATCH_SIZE = 48;

/** Fetch every book matching the current shop filters (all pages). */
export async function fetchAllMatchingBooks(
  opts: Omit<ListBooksOpts, "page" | "pageSize">
): Promise<Book[]> {
  const all: Book[] = [];
  let page = 1;
  let total = Infinity;

  while (all.length < total) {
    const { books, total: count } = await listBooks({
      ...opts,
      page,
      pageSize: BATCH_SIZE,
      withCount: page === 1,
    });
    if (page === 1) total = count;
    all.push(...books);
    if (books.length === 0 || books.length < BATCH_SIZE) break;
    page += 1;
    // Safety cap for very large catalogs
    if (page > 500) break;
  }

  return all;
}

function yearValue(book: Book): string | number {
  if (book.publish_year != null) return book.publish_year;
  if (book.published_at) {
    const year = new Date(book.published_at).getFullYear();
    if (!Number.isNaN(year)) return year;
  }
  return "";
}

/** Price as plain PKR rupees (same as stock list), not currency-formatted. */
function priceValue(book: Book): number {
  return Math.round(book.price_cents / 100);
}

export function booksToExcelRows(books: Book[]) {
  return books.map((book) => ({
    code: book.code ?? "",
    author: book.author,
    title: book.title,
    bind: book.bind ?? "",
    year: yearValue(book),
    price: priceValue(book),
  }));
}

export function downloadBooksExcel(
  books: Book[],
  filename = "allied-books"
): void {
  const rows = booksToExcelRows(books);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 50 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Books");
  const safeName = filename
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  XLSX.writeFile(workbook, `${safeName || "allied-books"}.xlsx`);
}
