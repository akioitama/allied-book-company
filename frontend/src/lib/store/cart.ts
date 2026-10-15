import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Book, CartItem } from "@/types";

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
