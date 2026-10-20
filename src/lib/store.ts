import { useSyncExternalStore } from "react";
import { readStored, writeStored } from "./storage";

/**
 * A tiny global store kept in localStorage and synced across open tabs.
 * Used for the guest cart and recent searches.
 */
export function createStoredStore<T>(key: string, fallback: T) {
  let value: T | undefined;
  const listeners = new Set<() => void>();

  const get = (): T => {
    if (value === undefined) value = readStored<T>(key, fallback);
    return value;
  };

  const set = (next: T | ((current: T) => T)) => {
    value =
      typeof next === "function" ? (next as (current: T) => T)(get()) : next;
    writeStored(key, value);
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) {
        value = readStored<T>(key, fallback);
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  function useStore(): T;
  function useStore<S>(select: (state: T) => S): S;
  function useStore<S>(select?: (state: T) => S) {
    const state = useSyncExternalStore(subscribe, get, () => fallback);
    return select ? select(state) : state;
  }

  return { get, set, subscribe, useStore };
}
