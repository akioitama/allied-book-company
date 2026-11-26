/**
 * Tiny browser-side request cache.
 *
 * Everything the storefront reads from Supabase is billed as a request, both by
 * Supabase and (when the fetch lands on our own routes) by Vercel. Identical
 * reads within a short window therefore reuse one network round-trip instead of
 * firing a new one per component mount (e.g. the shop grid and the header
 * search both resolving the category list, or a shopper paging back and forth).
 *
 * - In-flight calls are shared (deduplicated) so parallel mounts cost 1 request.
 * - Results are kept in memory for a short TTL, then revalidated.
 * - Failures are never cached, and the in-flight entry is released so the next
 *   caller retries.
 */

type Entry<T> = {
  /** Resolved value, present once the first request succeeded. */
  value?: T;
  /** Cached time of `value`. */
  at: number;
  /** Shared in-flight promise. */
  pending?: Promise<T>;
};

const store = new Map<string, Entry<unknown>>();

export function cachedJson<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit?.value !== undefined && now - hit.at < ttlMs) {
    return Promise.resolve(hit.value);
  }
  if (hit?.pending) return hit.pending;

  const entry: Entry<T> = { at: hit?.at ?? 0, value: hit?.value };
  // A stale value is served if the refresh fails, so a blip never empties a
  // page that already rendered fine.
  entry.pending = load()
    .then((value) => {
      store.set(key, { value, at: Date.now() });
      return value;
    })
    .catch((error) => {
      if (entry.value !== undefined) {
        store.set(key, { value: entry.value, at: entry.at });
        return entry.value;
      }
      store.delete(key);
      throw error;
    });
  store.set(key, entry);
  return entry.pending;
}

/** Drop a cached entry (or the whole cache) after a write that invalidates it. */
export function invalidateCache(key?: string) {
  if (key === undefined) store.clear();
  else store.delete(key);
}
