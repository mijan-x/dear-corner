import { useSyncExternalStore } from "react";

/** Open/closed state of the cart drawer, so any page can open it. */
let open = false;
let used = false;
const listeners = new Set<() => void>();

function set(next: boolean) {
  open = next;
  if (next) used = true;
  listeners.forEach((listener) => listener());
}

export const cartDrawer = {
  open: () => set(true),
  close: () => set(false),
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => open,
};

export function useCartDrawerOpen() {
  return useSyncExternalStore(
    cartDrawer.subscribe,
    cartDrawer.get,
    cartDrawer.get,
  );
}

/** True once the drawer has been opened (its code is loaded on demand). */
export function useCartDrawerUsed() {
  return useSyncExternalStore(
    cartDrawer.subscribe,
    () => used,
    () => used,
  );
}
