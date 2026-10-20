import {
  useCallback,
  useEffect,
  useEffectEvent,
  useSyncExternalStore,
} from "react";
import { readStored, writeStored } from "./storage";

/**
 * A small shared cache for read-only shop data (settings, menu, product
 * lists). Each key is fetched once and shared by every component that asks
 * for it; data older than `staleMs` is refreshed in the background while the
 * old data stays on screen. With `persist`, the last good copy is kept in
 * localStorage so a returning visitor sees the menu and announcement at once.
 */
type Snapshot<T> = {
  data: T | undefined;
  error: unknown;
  loading: boolean;
};

type Entry<T> = {
  snapshot: Snapshot<T>;
  fetchedAt: number;
  failedAt: number;
  inflight?: Promise<void>;
  listeners: Set<() => void>;
};

const cache = new Map<string, Entry<unknown>>();
const PERSIST_PREFIX = "dc-cache:";
const RETRY_AFTER_ERROR_MS = 30_000;
const EMPTY: Snapshot<never> = {
  data: undefined,
  error: undefined,
  loading: false,
};

function getEntry<T>(key: string, persist: boolean): Entry<T> {
  let entry = cache.get(key) as Entry<T> | undefined;
  if (!entry) {
    const stored = persist
      ? readStored<T | undefined>(PERSIST_PREFIX + key, undefined)
      : undefined;
    entry = {
      snapshot: { data: stored, error: undefined, loading: false },
      fetchedAt: 0,
      failedAt: 0,
      listeners: new Set(),
    };
    cache.set(key, entry as Entry<unknown>);
  }
  return entry;
}

function update<T>(entry: Entry<T>, next: Partial<Snapshot<T>>) {
  entry.snapshot = { ...entry.snapshot, ...next };
  entry.listeners.forEach((listener) => listener());
}

export type QueryOptions = {
  /** How long fetched data counts as fresh. Default 5 minutes. */
  staleMs?: number;
  /** Keep the last good copy in localStorage. */
  persist?: boolean;
};

/** Fetches (or joins the fetch already running for) a key. */
export function fetchQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  { persist = false }: QueryOptions = {},
): Promise<void> {
  const entry = getEntry<T>(key, persist);
  if (entry.inflight) return entry.inflight;
  update(entry, { loading: true });
  entry.inflight = fetcher()
    .then(
      (data) => {
        entry.fetchedAt = Date.now();
        update(entry, { data, error: undefined, loading: false });
        if (persist) writeStored(PERSIST_PREFIX + key, data);
      },
      (error: unknown) => {
        // Tried again on a later mount after a short pause, never in a loop.
        entry.failedAt = Date.now();
        update(entry, { error, loading: false });
      },
    )
    .finally(() => {
      entry.inflight = undefined;
    });
  return entry.inflight;
}

/** Drops a cached key so the next use fetches it again. */
export function invalidateQuery(key: string) {
  const entry = cache.get(key);
  if (entry) entry.fetchedAt = 0;
}

export function useQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  { staleMs = 5 * 60_000, persist = false }: QueryOptions = {},
) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!key) return () => {};
      const entry = getEntry<T>(key, persist);
      entry.listeners.add(onChange);
      return () => {
        entry.listeners.delete(onChange);
      };
    },
    [key, persist],
  );
  const getSnapshot = () =>
    key ? getEntry<T>(key, persist).snapshot : (EMPTY as Snapshot<T>);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const load = useEffectEvent((force: boolean) => {
    if (!key) return;
    const entry = getEntry<T>(key, persist);
    const now = Date.now();
    const fresh = now - entry.fetchedAt <= staleMs;
    const coolingDown = now - entry.failedAt < RETRY_AFTER_ERROR_MS;
    if (force || (!fresh && !coolingDown)) {
      void fetchQuery(key, fetcher, { persist });
    }
  });

  useEffect(() => {
    load(false);
  }, [key]);

  const refetch = useCallback(() => {
    if (key) void fetchQuery(key, fetcher, { persist });
  }, [key, fetcher, persist]);

  return { ...snapshot, refetch };
}
