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
      .catch((error: unknown) => {
        clientPromise = null; // try again next time (for example after going offline)
        throw error;
      });
  }
  return clientPromise;
}

export { isSupabaseConfigured };
