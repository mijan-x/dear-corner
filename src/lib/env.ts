/** Public runtime configuration. Both Supabase values are safe in the browser. */
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "",
  siteUrl: (
    import.meta.env.VITE_SITE_URL?.trim() || "https://dear-corner.vercel.app"
  ).replace(/\/$/, ""),
};

export const isSupabaseConfigured = Boolean(
  env.supabaseUrl && env.supabaseAnonKey,
);
