import { useSyncExternalStore } from "react";
import {
  getSupabase,
  isSupabaseConfigured,
  onSupabaseReady,
} from "../../lib/supabase";

/**
 * Who is signed in. Visitors who have never signed in don't download the
 * Supabase library for this: we only look for a saved session (or a sign-in
 * link in the address) and load it when there is one.
 */
export type SessionUser = { id: string; email: string | null };
export type AuthState =
  | { status: "loading"; user: null }
  | { status: "guest"; user: null }
  | { status: "signed-in"; user: SessionUser };

let state: AuthState = { status: "loading", user: null };
const listeners = new Set<() => void>();
const userListeners = new Set<
  (user: SessionUser | null, previous: SessionUser | null) => void
>();

function set(next: AuthState) {
  const previous = state.user;
  const wasLoading = state.status === "loading";
  state = next;
  listeners.forEach((listener) => listener());
  // Also once the first answer arrives, so listeners learn "nobody".
  if (wasLoading || (previous?.id ?? null) !== (next.user?.id ?? null)) {
    userListeners.forEach((listener) => listener(next.user, previous));
  }
}

export const authStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Called when the signed-in person changes (sign in, sign out, switch). */
  onUserChange(
    listener: (user: SessionUser | null, previous: SessionUser | null) => void,
  ) {
    userListeners.add(listener);
    return () => {
      userListeners.delete(listener);
    };
  },
};

export function useAuth(): AuthState {
  return useSyncExternalStore(
    authStore.subscribe,
    authStore.get,
    authStore.get,
  );
}

function hasSavedSession(): boolean {
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        return true;
      }
    }
  } catch {
    // storage blocked: no saved session
  }
  return false;
}

function hasSignInLinkInUrl(): boolean {
  const { hash, search } = window.location;
  return (
    hash.includes("access_token=") ||
    hash.includes("error_description=") ||
    /[?&]code=/.test(search)
  );
}

let started = false;

/** Starts tracking the session (once, from the app root). */
export function startAuth() {
  if (started) return;
  started = true;
  if (!isSupabaseConfigured) {
    set({ status: "guest", user: null });
    return;
  }
  onSupabaseReady((client) => {
    client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      // Outside the auth callback: other Supabase calls may run from here.
      window.setTimeout(() => {
        set(
          user
            ? {
                status: "signed-in",
                user: { id: user.id, email: user.email ?? null },
              }
            : { status: "guest", user: null },
        );
      }, 0);
    });
  });
  if (hasSavedSession() || hasSignInLinkInUrl()) {
    getSupabase().catch(() => set({ status: "guest", user: null }));
  } else {
    set({ status: "guest", user: null });
  }
}

export async function signOut() {
  const client = await getSupabase();
  await client.auth.signOut();
}
