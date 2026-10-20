import { createStoredStore } from "../../lib/store";

/** The last five searches, newest first, kept only in this browser. */
const MAX = 5;
const recent = createStoredStore<string[]>("dc-recent-searches", []);

export const recentSearches = {
  useList: () => recent.useStore(),
  add(query: string) {
    const q = query.trim().replace(/\s+/g, " ");
    if (q.length < 2) return;
    recent.set((list) =>
      [
        q,
        ...list.filter((item) => item.toLowerCase() !== q.toLowerCase()),
      ].slice(0, MAX),
    );
  },
  remove(query: string) {
    recent.set((list) => list.filter((item) => item !== query));
  },
  clear() {
    recent.set([]);
  },
};
