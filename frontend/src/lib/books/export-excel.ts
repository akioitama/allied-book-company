import type { Book } from "@/types";
import { listBooks, type ListBooksOpts } from "@/lib/books/supabase-books";

const BATCH_SIZE = 48;

const COLUMNS = [
  { key: "code", header: "code", width: 14 },
  { key: "author", header: "author", width: 28 },
  { key: "title", header: "title", width: 50 },
  { key: "isbn", header: "isbn", width: 16 },
  { key: "publisher", header: "publisher", width: 28 },
  { key: "bind", header: "bind", width: 10 },
  { key: "year", header: "year", width: 8 },
  { key: "price", header: "price", width: 12 },
] as const;

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
    isbn: book.isbn ?? "",
    publisher: book.publisher ?? "",
    bind: book.bind ?? "",
    year: yearValue(book),
    price: priceValue(book),
  }));
}

export async function downloadBooksExcel(
  books: Book[],
  filename = "allied-books"
): Promise<void> {
  // Lazy-load ExcelJS so the shop page chunk stays small.
  const ExcelJS = (await import("exceljs")).default;
  const rows = booksToExcelRows(books);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Books");

  worksheet.columns = COLUMNS.map((col) => ({
    key: col.key,
    width: col.width,
  }));

  const headerRow = worksheet.addRow(COLUMNS.map((col) => col.header));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 12 };
  });

  for (const row of rows) {
    worksheet.addRow(row);
  }

  const safeName = filename
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName || "allied-books"}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
