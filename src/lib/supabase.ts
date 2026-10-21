import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { env, isSupabaseConfigured } from "./env";

export type DearCornerClient = SupabaseClient<Database>;

/**
 * The single Supabase client. The library is loaded on first use, in its own
 * file, so the first paint of every page doesn't wait for it. When the env
 * vars are missing (for example a preview build before they are added in
 * Vercel) the site still loads; data calls reject with
 * SupabaseNotConfiguredError, which pages show as an error state instead of
 * a blank screen.
 */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("The shop isn't connected to its database yet.");
    this.name = "SupabaseNotConfiguredError";
  }
}

let clientPromise: Promise<DearCornerClient> | null = null;
const readyListeners = new Set<(client: DearCornerClient) => void>();
let readyClient: DearCornerClient | null = null;

/**
 * Runs once the client exists (right away if it already does). The sign-in
 * state listens here, so it never loads the library just to find out a
 * visitor isn't signed in.
 */
export function onSupabaseReady(listener: (client: DearCornerClient) => void) {
  if (readyClient) listener(readyClient);
  else readyListeners.add(listener);
}

export function getSupabase(): Promise<DearCornerClient> {
  if (!isSupabaseConfigured) {
    return Promise.reject(new SupabaseNotConfiguredError());
  }
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js")
      .then(({ createClient }) =>
        createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        }),
      )
      .then((client) => {
        readyClient = client;
        readyListeners.forEach((listener) => listener(client));
        readyListeners.clear();
        return client;
      })
      .catch((error: unknown) => {
        clientPromise = null; // try again next time (for example after going offline)
        throw error;
      });
  }
  return clientPromise;
}

export { isSupabaseConfigured };
