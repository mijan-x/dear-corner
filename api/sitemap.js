/**
 * /sitemap.xml (rewritten here in vercel.json). Lists the public pages plus
 * every active category, collection and product, read live from Supabase with
 * the public (anon) key, so new products appear without a redeploy. Cached at
 * the edge for an hour. If the database can't be reached, the static pages
 * are still listed.
 */

const STATIC_PATHS = [
  "/",
  "/shop",
  "/track-order",
  "/about",
  "/contact",
  "/faq",
  "/delivery",
  "/exchange-and-returns",
  "/privacy",
  "/terms",
];

const xmlEscape = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

async function readTable(base, key, table, query) {
  const res = await fetch(`${base}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`${table}: ${res.status}`);
  return res.json();
}

export async function buildSitemap(env = process.env) {
  const site = (env.VITE_SITE_URL || "https://dearcornerbd.vercel.app").replace(
    /\/$/,
    "",
  );
  const base = (env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.VITE_SUPABASE_ANON_KEY || "";

  const entries = STATIC_PATHS.map((path) => ({ path }));
  if (base && key) {
    try {
      const [categories, collections, products] = await Promise.all([
        readTable(base, key, "categories", "select=slug&is_active=eq.true"),
        readTable(base, key, "collections", "select=slug&is_active=eq.true"),
        readTable(
          base,
          key,
          "products",
          "select=slug,updated_at&status=eq.active&order=published_at.desc",
        ),
      ]);
      for (const c of categories) entries.push({ path: `/shop/${c.slug}` });
      for (const c of collections)
        entries.push({ path: `/collections/${c.slug}` });
      for (const p of products)
        entries.push({
          path: `/products/${p.slug}`,
          lastmod: p.updated_at?.slice(0, 10),
        });
    } catch (error) {
      console.error("sitemap: catalog not available", error);
    }
  }

  const urls = entries
    .map(
      ({ path, lastmod }) =>
        `  <url><loc>${xmlEscape(site + path)}</loc>${
          lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
        }</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export default async function handler(_req, res) {
  const xml = await buildSitemap();
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  );
  res.status(200).send(xml);
}
