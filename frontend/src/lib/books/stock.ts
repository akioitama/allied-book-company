import { createClient } from "@supabase/supabase-js";

/**
 * Stock handling for a placed order.
 *
 * The storefront uses the PUBLIC anon key, and `books` has no UPDATE policy
 * (see supabase/schema.sql), so a direct table write is silently blocked. Stock
 * therefore changes through the `decrement_book_stock` function
 * (supabase/migrations/004_decrement_book_stock.sql), which is SECURITY DEFINER
 * and validates its input.
 */

export type StockLine = {
  /** Either the book's id (preferred) or its ISBN for a fallback lookup. */
  book_id?: string | null;
  isbn?: string | null;
  quantity: number;
  /** E-books hold no physical stock. */
  is_ebook?: boolean;
};

export type StockResult = {
  ok: boolean;
  applied: { book_id: string; quantity: number; new_stock: number }[];
  /** Present when something prevented the update — surfaced to the store team. */
  warning?: string;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the service role key (bypasses RLS entirely); fall back to the anon
  // key, which still works via the SECURITY DEFINER function + its grant.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolve a book id from an ISBN when the client only sent the ISBN. */
async function resolveBookId(
  supabase: ReturnType<typeof adminClient>,
  isbn?: string | null
): Promise<string | null> {
  if (!supabase) return null;
  const key = (isbn ?? "").replace(/[^0-9Xx]/g, "");
  if (!key) return null;
  const { data } = await supabase
    .from("books")
    .select("id")
    .or(`isbn.eq.${key},isbn13.eq.${key}`)
    .limit(1);
  return data?.[0]?.id ?? null;
}

export async function decrementStockForOrder(
  lines: StockLine[]
): Promise<StockResult> {
  const sellable = lines.filter(
    (l) => !l.is_ebook && Number(l.quantity) > 0
  );
  if (sellable.length === 0) return { ok: true, applied: [] };

  const supabase = adminClient();
  if (!supabase) {
    return {
      ok: false,
      applied: [],
      warning:
        "Stock was not updated: Supabase is not configured for this deployment.",
    };
  }

  const applied: StockResult["applied"] = [];
  const problems: string[] = [];

  for (const line of sellable) {
    const bookId = line.book_id || (await resolveBookId(supabase, line.isbn));
    if (!bookId) {
      problems.push(`book not found for ISBN ${line.isbn ?? "(none)"}`);
      continue;
    }

    const { data, error } = await supabase.rpc("decrement_book_stock", {
      p_book_id: bookId,
      p_quantity: Math.trunc(line.quantity),
    });

    if (error) {
      // The function may not be installed yet on an older database.
      const missing =
        error.code === "PGRST202" || /decrement_book_stock/i.test(error.message);
      problems.push(
        missing
          ? `stock function missing (run supabase/migrations/004_decrement_book_stock.sql)`
          : error.message
      );
      continue;
    }

    applied.push({
      book_id: bookId,
      quantity: Math.trunc(line.quantity),
      new_stock: typeof data === "number" ? data : Number(data),
    });
  }

  if (applied.length === 0) {
    return { ok: false, applied, warning: `Stock update failed: ${problems.join("; ")}` };
  }
  return {
    ok: problems.length === 0,
    applied,
    warning: problems.length ? `Partial stock update: ${problems.join("; ")}` : undefined,
  };
}
