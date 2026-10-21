import { fetchQuery, invalidateQuery, useQuery } from "../../lib/query";
import { getSupabase } from "../../lib/supabase";

/**
 * Admin data goes through the same shared cache as the shop, under "admin:"
 * keys, and is always fresh enough for working (30 s by default).
 */
export function useAdminQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  staleMs = 30_000,
) {
  return useQuery(key ? `admin:${key}` : null, fetcher, { staleMs });
}

/** Fetches a key again now, so every page showing it updates. */
export function refreshAdmin<T>(key: string, fetcher: () => Promise<T>) {
  invalidateQuery(`admin:${key}`);
  return fetchQuery(`admin:${key}`, fetcher);
}

/** Marks keys stale; pages fetch them again when they next open. */
export function forgetAdmin(...keys: string[]) {
  for (const key of keys) invalidateQuery(`admin:${key}`);
}

export const db = getSupabase;

/** Throws the Supabase error, or returns the data. */
export function must<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
