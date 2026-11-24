import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Book, CartItem } from "@/types";
import { isEbook } from "@/lib/data/school-books";

/**
 * True for digital items. Prefers the flag snapshotted at add-to-cart, and
 * falls back to the ISBN so carts persisted *before* this feature (which have
 * no flag) are still priced correctly.
 */
export function isEbookItem(item: {
  isbn?: string | null;
  is_ebook?: boolean;
}): boolean {
  return item.is_ebook ?? isEbook(item.isbn);
}

type CartState = {
  items: CartItem[];
  addItem: (book: Book, quantity?: number) => void;
  removeItem: (bookId: string) => void;
  setQuantity: (bookId: string, quantity: number) => void;
  clear: () => void;
  count: () => number;
  totalCents: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (book, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.bookId === book.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.bookId === book.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                bookId: book.id,
                slug: book.slug,
                title: book.title,
                author: book.author,
                price_cents: book.price_cents,
                cover_image_url: book.cover_image_url,
                quantity,
                isbn: book.isbn ?? null,
                // Snapshot the digital flag at add time.
                is_ebook: isEbook(book.isbn),
              },
            ],
          };
        });
      },
      removeItem: (bookId) =>
        set((state) => ({
          items: state.items.filter((i) => i.bookId !== bookId),
        })),
      setQuantity: (bookId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.bookId !== bookId)
              : state.items.map((i) =>
                  i.bookId === bookId ? { ...i, quantity } : i
                ),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      totalCents: () =>
        get().items.reduce((n, i) => n + i.price_cents * i.quantity, 0),
    }),
    { name: "allied-cart" }
  )
);
