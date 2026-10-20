import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "./env";

/**
 * The single Supabase client. When the env vars are missing (for example a
 * preview build before they are added in Vercel) the site still loads; any
 * data call throws SupabaseNotConfiguredError, which pages show as an error
 * state instead of a blank screen.
 */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("The shop isn't connected to its database yet.");
    this.name = "SupabaseNotConfiguredError";
  }
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) throw new SupabaseNotConfiguredError();
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export { isSupabaseConfigured };
