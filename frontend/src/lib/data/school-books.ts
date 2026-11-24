/**
 * "Books for school" shelf — these are sold as e-books: no delivery charge and
 * the order must be paid upfront.
 *
 * The canonical rules live in `@/lib/shipping` (shared with the server route);
 * this module is the books-facing entry point. Add an ISBN there to make a book
 * an e-book everywhere.
 */
export {
  SCHOOL_BOOK_ISBNS,
  isEbookIsbn,
  normalizeIsbn,
  isEbookIsbn as isEbook,
} from "@/lib/shipping";
