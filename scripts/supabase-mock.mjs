// Answers the storefront's Supabase requests from the local test database
// (the one supabase/tests/run_local.sh starts, with the sample seed), so
// screenshots and checks show real pages without a live project.
// Used by scripts/screenshots.mjs when SUPABASE_MOCK_URL is set; the build
// must point VITE_SUPABASE_URL at the same address.
// Connection: PGHOST (default /tmp), PGPORT (54329), PGUSER (postgres).
import { execFileSync } from "node:child_process";

// Argument types of the read-only storefront functions.
const RPC_TYPES = {
  catalog_products: {
    p_category: "text",
    p_collection: "text",
    p_search: "text",
    p_min_price: "integer",
    p_max_price: "integer",
    p_colors: "text[]",
    p_in_stock: "boolean",
    p_on_sale: "boolean",
    p_sort: "text",
    p_limit: "integer",
    p_offset: "integer",
    p_exclude: "uuid",
    p_flag: "text",
  },
  catalog_facets: {
    p_category: "text",
    p_collection: "text",
    p_search: "text",
  },
  search_suggestions: { p_query: "text" },
  get_product: { p_slug: "text" },
  related_products: { p_product_id: "uuid", p_limit: "integer" },
  get_listing: { p_kind: "text", p_slug: "text" },
  home_feed: {},
  storefront_nav: {},
};
const RETURNS_SET = new Set(["catalog_products", "related_products"]);

function sql(query) {
  return execFileSync(
    "psql",
    [
      "-X",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-h",
      process.env.PGHOST || "/tmp",
      "-p",
      process.env.PGPORT || "54329",
      "-U",
      process.env.PGUSER || "postgres",
      "-d",
      "postgres",
      "-c",
      query,
    ],
    { encoding: "utf8" },
  ).trim();
}

function rpc(fn, body) {
  const types = RPC_TYPES[fn];
  if (!types) throw new Error(`no mock for rpc ${fn}`);
  const args = Object.keys(body)
    .filter((k) => k in types && body[k] !== undefined && body[k] !== null)
    .map((k) =>
      types[k] === "text[]"
        ? `${k} => array(select jsonb_array_elements_text(a.j->'${k}'))`
        : `${k} => (a.j->>'${k}')::${types[k]}`,
    )
    .join(", ");
  // Arguments travel as one dollar-quoted JSON literal, never spliced in.
  const json = JSON.stringify(body).replaceAll("$", "\\u0024");
  const from = `with a as (select $j$${json}$j$::jsonb as j)`;
  return RETURNS_SET.has(fn)
    ? sql(
        `${from} select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from a, public.${fn}(${args}) r`,
      )
    : sql(
        `${from} select coalesce(public.${fn}(${args})::text, 'null') from a`,
      );
}

function table(name, accept) {
  if (name === "store_settings") {
    const row = sql(
      "select to_jsonb(s) from public.store_settings s where id = 1",
    );
    return accept.includes("vnd.pgrst.object") ? row : `[${row}]`;
  }
  if (name === "shipping_zones") {
    return sql(
      "select coalesce(jsonb_agg(to_jsonb(z) order by position), '[]') from public.shipping_zones z where is_active",
    );
  }
  if (name === "reviews") {
    return sql(
      "select coalesce(jsonb_agg(jsonb_build_object('id', id, 'reviewer_name', reviewer_name, 'rating', rating, 'title', title, 'body', body, 'created_at', created_at)), '[]') from public.reviews where status = 'approved'",
    );
  }
  throw new Error(`no mock for table ${name}`);
}

/** Routes a Playwright browser context's Supabase requests to the database. */
export async function mockSupabase(context, supabaseUrl) {
  const origin = supabaseUrl.replace(/\/+$/, "");
  await context.route(`${origin}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
    };
    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers });
    }
    try {
      const fn = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
      const tbl = url.pathname.match(/^\/rest\/v1\/(\w+)$/);
      let body;
      if (fn) {
        body = rpc(fn[1], JSON.parse(request.postData() || "{}"));
      } else if (tbl && request.method() === "GET") {
        body = table(tbl[1], request.headers()["accept"] ?? "");
      } else {
        throw new Error(
          `unexpected request ${request.method()} ${url.pathname}`,
        );
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body,
        headers,
      });
    } catch (error) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: String(error.message) }),
        headers,
      });
    }
  });
}
