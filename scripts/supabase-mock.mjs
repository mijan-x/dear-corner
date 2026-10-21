// Answers the storefront's Supabase requests from the local test database
// (the one supabase/tests/run_local.sh starts, with the sample seed), so
// screenshots and checks show real pages and real flows without a live
// project: database functions, table reads and writes (with Row Level
// Security, as the signed-in customer or as a visitor) and email sign-in.
// Used by scripts/screenshots.mjs when SUPABASE_MOCK_URL is set; the build
// must point VITE_SUPABASE_URL at the same address.
// Connection: PGHOST (default /tmp), PGPORT (54329), PGUSER (postgres).
//
// Sign-in: any email gets the code 123456 (MOCK_OTP_CODE).
import { execFileSync } from "node:child_process";
import { randomInt } from "node:crypto";

export const MOCK_OTP_CODE = "123456";

class DbError extends Error {
  constructor(stderr) {
    const line = (label) =>
      stderr.match(new RegExp(`(?:^|: )${label}:\\s+(.*)$`, "m"))?.[1] ?? null;
    const error = line("ERROR") ?? stderr.trim();
    const [, code = "XX000", message = error] =
      error.match(/^([0-9A-Z]{5}):\s+(.*)$/) ?? [];
    super(message);
    this.code = code;
    this.details = line("DETAIL");
    this.hint = line("HINT");
  }
}

export function sql(query) {
  try {
    return execFileSync(
      "psql",
      [
        "-X",
        "-q",
        "-At",
        "-v",
        "ON_ERROR_STOP=1",
        "-v",
        "VERBOSITY=verbose",
        "-h",
        process.env.PGHOST || "/tmp",
        "-p",
        process.env.PGPORT || "54329",
        "-U",
        process.env.PGUSER || "postgres",
        "-d",
        "postgres",
        "-f",
        "-",
      ],
      {
        encoding: "utf8",
        input: `${query};\n`,
        stdio: ["pipe", "pipe", "pipe"],
      },
    ).trim();
  } catch (error) {
    throw new DbError(String(error.stderr ?? error.message));
  }
}

const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
// JSON travels as one dollar-quoted literal, never spliced into the SQL.
const jsonLiteral = (value) =>
  `$j$${JSON.stringify(value ?? null).replaceAll("$", "\\u0024")}$j$::jsonb`;
const ident = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`bad name ${name}`);
  return name;
};

// --------------------------------------------------------------------------
// Who is asking: a visitor (anon key) or a signed-in customer (our token).
// --------------------------------------------------------------------------
function b64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeToken(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({
    sub: user.id,
    email: user.email,
    role: "authenticated",
    aud: "authenticated",
    exp,
  })}.mock-signature`;
}

function claimsFrom(headers) {
  const auth = headers["authorization"] ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    return claims.role === "authenticated" && claims.sub ? claims : null;
  } catch {
    return null;
  }
}

/** Runs one statement as the visitor or customer, like PostgREST does. */
function asRequester(claims, statement) {
  const role = claims ? "authenticated" : "anon";
  // Each request looks like it comes from its own address, so the shop's
  // rate limits don't trip during a test run.
  const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(256)}`;
  return sql(
    [
      "begin;",
      "\\o /dev/null",
      `set local role ${role};`,
      `select set_config('request.jwt.claims', ${literal(JSON.stringify(claims ?? { role }))}, true),`,
      `  set_config('request.headers', ${literal(JSON.stringify({ "x-forwarded-for": ip }))}, true);`,
      "\\o",
      `${statement};`,
      "commit",
    ].join("\n"),
  );
}

// --------------------------------------------------------------------------
// Database functions (POST /rest/v1/rpc/<name>)
// --------------------------------------------------------------------------
const signatures = new Map();

function signature(fn) {
  if (!signatures.has(fn)) {
    const row = sql(
      `select jsonb_build_object(
         'names', coalesce(to_jsonb(p.proargnames), '[]'),
         'types', (select coalesce(jsonb_agg(format_type(t, null) order by i), '[]')
                   from unnest(p.proargtypes) with ordinality u(t, i)),
         'returns', format_type(p.prorettype, null),
         'set', p.proretset)
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = ${literal(fn)}
       limit 1`,
    );
    if (!row) throw new Error(`no function ${fn}`);
    signatures.set(fn, JSON.parse(row));
  }
  return signatures.get(fn);
}

function rpc(fn, body, claims) {
  const sig = signature(ident(fn));
  const args = sig.names
    .map((name, i) => [name, sig.types[i]])
    .filter(([name]) => body[name] !== undefined && body[name] !== null)
    .map(([name, type]) => {
      if (type === "jsonb" || type === "json")
        return `${name} => (a.j->'${name}')`;
      if (type.endsWith("[]")) {
        return `${name} => array(select jsonb_array_elements_text(a.j->'${name}'))::${type}`;
      }
      return `${name} => (a.j->>'${name}')::${type}`;
    })
    .join(", ");
  const from = `with a as (select ${jsonLiteral(body)} as j)`;
  if (sig.set) {
    return asRequester(
      claims,
      `${from} select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from a, public.${fn}(${args}) r`,
    );
  }
  if (sig.returns === "void") {
    asRequester(claims, `${from} select public.${fn}(${args}) from a`);
    return "null";
  }
  return asRequester(
    claims,
    `${from} select coalesce(to_jsonb(public.${fn}(${args}))::text, 'null') from a`,
  );
}

// --------------------------------------------------------------------------
// Tables (GET / POST / PATCH / DELETE /rest/v1/<table>), the subset of
// PostgREST the shop uses: select lists with embedded relations, eq / in /
// is filters, order and limit.
// --------------------------------------------------------------------------
const RELATIONS = {
  "orders.order_items": { many: true, on: "c.order_id = t.id" },
  "order_items.orders": { many: false, on: "c.id = t.order_id" },
  "wishlists.products": { many: false, on: "c.id = t.product_id" },
  "products.product_variants": { many: true, on: "c.product_id = t.id" },
};

function splitTop(text) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function selectJson(table, alias, select) {
  const items = splitTop(select || "*");
  if (items.length === 1 && items[0] === "*") return `to_jsonb(${alias})`;
  const pairs = items.map((item) => {
    const nested = item.match(/^(\w+)\((.*)\)$/s);
    if (!nested) {
      if (item === "*") throw new Error("mixed * is not mocked");
      return `${literal(item)}, ${alias}.${ident(item)}`;
    }
    const [, rel, inner] = nested;
    const relation = RELATIONS[`${table}.${rel}`];
    if (!relation) throw new Error(`no mock for relation ${table}.${rel}`);
    const childAlias = `c${alias.length}`;
    const on = relation.on
      .replaceAll("c.", `${childAlias}.`)
      .replaceAll("t.", `${alias}.`);
    const json = selectJson(rel, childAlias, inner);
    return relation.many
      ? `${literal(rel)}, (select coalesce(jsonb_agg(${json}), '[]'::jsonb) from public.${ident(rel)} ${childAlias} where ${on})`
      : `${literal(rel)}, (select ${json} from public.${ident(rel)} ${childAlias} where ${on} limit 1)`;
  });
  return `jsonb_build_object(${pairs.join(", ")})`;
}

const RESERVED = new Set([
  "select",
  "order",
  "limit",
  "offset",
  "on_conflict",
  "columns",
]);

function whereClause(params) {
  const conditions = [];
  for (const [key, value] of params) {
    if (RESERVED.has(key)) continue;
    const column = `t.${ident(key)}`;
    const [, op, operand] = value.match(/^(\w+)\.(.*)$/s) ?? [];
    if (op === "eq") conditions.push(`${column} = ${literal(operand)}`);
    else if (op === "neq") conditions.push(`${column} <> ${literal(operand)}`);
    else if (op === "is") {
      conditions.push(
        `${column} is ${operand === "null" ? "null" : operand === "true" ? "true" : "false"}`,
      );
    } else if (op === "in") {
      const list = operand
        .replace(/^\(|\)$/g, "")
        .split(",")
        .map((v) => literal(v.replace(/^"|"$/g, "")));
      conditions.push(`${column} in (${list.join(", ")})`);
    } else throw new Error(`no mock for filter ${key}=${value}`);
  }
  return conditions.length ? `where ${conditions.join(" and ")}` : "";
}

function orderClause(order) {
  if (!order) return "";
  return `order by ${order
    .split(",")
    .map((part) => {
      const [column, ...mods] = part.split(".");
      return [
        `t.${ident(column)}`,
        mods.includes("desc") ? "desc" : "asc",
        mods.includes("nullsfirst")
          ? "nulls first"
          : mods.includes("nullslast")
            ? "nulls last"
            : "",
      ].join(" ");
    })
    .join(", ")}`;
}

function tableRequest(method, name, url, headers, body, claims) {
  const table = ident(name);
  const params = [...url.searchParams.entries()];
  const where = whereClause(params);
  const select = url.searchParams.get("select");
  if (method === "GET") {
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");
    const rows = asRequester(
      claims,
      `select coalesce(jsonb_agg(x.j), '[]'::jsonb) from (
         select ${selectJson(table, "t", select)} as j from public.${table} t
         ${where} ${orderClause(url.searchParams.get("order"))}
         ${limit ? `limit ${Number(limit)}` : ""} ${offset ? `offset ${Number(offset)}` : ""}
       ) x`,
    );
    if ((headers["accept"] ?? "").includes("vnd.pgrst.object")) {
      const list = JSON.parse(rows);
      return list.length === 1
        ? { status: 200, body: JSON.stringify(list[0]) }
        : {
            status: 406,
            body: JSON.stringify({
              code: "PGRST116",
              message: "JSON object requested, multiple (or no) rows returned",
            }),
          };
    }
    return { status: 200, body: rows };
  }
  const returning = `returning ${selectJson(table, "t", select)} as j`;
  let statement;
  if (method === "POST") {
    const records = Array.isArray(body) ? body : [body];
    const columns = [...new Set(records.flatMap((r) => Object.keys(r)))].map(
      ident,
    );
    statement = `insert into public.${table} as t (${columns.join(", ")})
      select ${columns.join(", ")} from jsonb_populate_recordset(null::public.${table}, ${jsonLiteral(records)})
      ${returning}`;
  } else if (method === "PATCH") {
    const columns = Object.keys(body).map(ident);
    statement = `update public.${table} t set (${columns.join(", ")}) =
      (select ${columns.join(", ")} from jsonb_populate_record(null::public.${table}, ${jsonLiteral(body)}))
      ${where} ${returning}`;
  } else if (method === "DELETE") {
    statement = `delete from public.${table} t ${where} ${returning}`;
  } else {
    throw new Error(`no mock for ${method} ${name}`);
  }
  const rows = asRequester(
    claims,
    `with w as (${statement}) select coalesce(jsonb_agg(w.j), '[]'::jsonb) from w`,
  );
  const wantsRows = (headers["prefer"] ?? "").includes("return=representation");
  return wantsRows
    ? { status: method === "POST" ? 201 : 200, body: rows }
    : { status: method === "POST" ? 201 : 204, body: "" };
}

// --------------------------------------------------------------------------
// Email sign-in (/auth/v1/...)
// --------------------------------------------------------------------------
function ensureUser(email) {
  const address = email.trim().toLowerCase();
  const id =
    sql(
      `select id from auth.users where email = ${literal(address)} limit 1`,
    ) ||
    sql(
      `insert into auth.users (email, email_confirmed_at) values (${literal(address)}, now()) returning id`,
    );
  return { id, email: address };
}

function userJson(user) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** A session object as Supabase returns it (and stores it in the browser). */
export function sessionFor(email) {
  const user = ensureUser(email);
  return {
    access_token: makeToken(user),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `refresh-${user.id}`,
    user: userJson(user),
  };
}

/** The localStorage entry that makes the browser signed in as `email`. */
export function sessionStorageEntry(supabaseUrl, email) {
  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  return {
    key: `sb-${ref}-auth-token`,
    value: JSON.stringify(sessionFor(email)),
  };
}

function authRequest(method, path, url, body, claims) {
  if (path === "otp" && method === "POST") return { status: 200, body: "{}" };
  if (path === "verify" && method === "POST") {
    if (String(body.token ?? "") !== MOCK_OTP_CODE || !body.email) {
      return {
        status: 403,
        body: JSON.stringify({
          code: 403,
          error_code: "otp_expired",
          msg: "Token has expired or is invalid",
        }),
      };
    }
    return { status: 200, body: JSON.stringify(sessionFor(body.email)) };
  }
  if (path === "token" && method === "POST") {
    const id = String(body.refresh_token ?? "").replace(/^refresh-/, "");
    const email = /^[0-9a-f-]{36}$/.test(id)
      ? sql(`select email from auth.users where id = ${literal(id)}`)
      : "";
    if (!email) {
      return {
        status: 400,
        body: JSON.stringify({
          code: 400,
          error_code: "refresh_token_not_found",
          msg: "Invalid Refresh Token",
        }),
      };
    }
    return { status: 200, body: JSON.stringify(sessionFor(email)) };
  }
  if (path === "user" && method === "GET") {
    if (!claims)
      return {
        status: 401,
        body: JSON.stringify({ code: 401, msg: "No session" }),
      };
    return {
      status: 200,
      body: JSON.stringify(userJson({ id: claims.sub, email: claims.email })),
    };
  }
  if (path === "logout") return { status: 204, body: "" };
  throw new Error(`no mock for auth ${method} ${path}${url.search}`);
}

// --------------------------------------------------------------------------

function errorStatus(error) {
  if (error.code === "42501") return 403;
  if (error.code === "23505") return 409;
  if (error instanceof DbError) return 400;
  return 500;
}

/** Routes a Playwright browser context's Supabase requests to the database. */
export async function mockSupabase(context, supabaseUrl, { log } = {}) {
  const origin = supabaseUrl.replace(/\/+$/, "");
  await context.route(`${origin}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    };
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
    const requestHeaders = request.headers();
    const claims = claimsFrom(requestHeaders);
    let body;
    try {
      body = JSON.parse(request.postData() || "{}");
    } catch {
      body = {};
    }
    try {
      const fn = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
      const tbl = url.pathname.match(/^\/rest\/v1\/(\w+)$/);
      const auth = url.pathname.match(/^\/auth\/v1\/(\w+)$/);
      let result;
      if (fn) result = { status: 200, body: rpc(fn[1], body, claims) };
      else if (tbl)
        result = tableRequest(
          method,
          tbl[1],
          url,
          requestHeaders,
          body,
          claims,
        );
      else if (auth) result = authRequest(method, auth[1], url, body, claims);
      else throw new Error(`unexpected request ${method} ${url.pathname}`);
      log?.(`${method} ${url.pathname} ${result.status}`);
      await route.fulfill({
        status: result.status,
        contentType: "application/json",
        body: result.body,
        headers,
      });
    } catch (error) {
      log?.(`${method} ${url.pathname} ERROR ${error.message}`);
      await route.fulfill({
        status: errorStatus(error),
        contentType: "application/json",
        body: JSON.stringify({
          code: error.code ?? "MOCK",
          message: String(error.message),
          details: error.details ?? null,
          hint: error.hint ?? null,
        }),
        headers,
      });
    }
  });
}

// --------------------------------------------------------------------------
// Demo data for screenshots: a signed-in customer with a saved address, a
// wishlist and two orders (one on its way with a courier, one delivered).
// --------------------------------------------------------------------------
export const DEMO_EMAIL = "rima@example.com";
export const DEMO_PHONE = "01712345678";

/** The first in-stock variant of each product slug. */
export function variantsFor(slugs) {
  return slugs.map((slug) =>
    sql(
      `select v.id from public.product_variants v join public.products p on p.id = v.product_id
       where p.slug = ${literal(slug)} and v.is_active and v.stock > 0
       order by v.position, v.created_at limit 1`,
    ),
  );
}

export function prepareDemoData() {
  const user = ensureUser(DEMO_EMAIL);
  const claims = { sub: user.id, role: "authenticated", email: user.email };
  sql(
    `update public.profiles set full_name = 'Rima Akter', phone = ${literal(DEMO_PHONE)} where id = ${literal(user.id)}`,
  );
  sql(`delete from public.cart_items where user_id = ${literal(user.id)}`);
  if (
    sql(
      `select count(*) from public.addresses where user_id = ${literal(user.id)}`,
    ) === "0"
  ) {
    asRequester(
      claims,
      `insert into public.addresses (label, full_name, phone, division, district, area, address_line)
       values ('Home', 'Rima Akter', ${literal(DEMO_PHONE)}, 'Dhaka', 'Dhaka', 'Dhanmondi', 'House 14, Road 7A'),
              ('Office', 'Rima Akter', ${literal(DEMO_PHONE)}, 'Dhaka', 'Dhaka', 'Gulshan', 'Level 5, 32 Gulshan Avenue')`,
    );
  }
  const customer = {
    name: "Rima Akter",
    phone: DEMO_PHONE,
    division: "Dhaka",
    district: "Dhaka",
    area: "Dhanmondi",
    address_line: "House 14, Road 7A",
  };
  const place = (slugs) => {
    const items = variantsFor(slugs).map((variant_id) => ({
      variant_id,
      quantity: 1,
    }));
    const quote = JSON.parse(
      rpc(
        "quote_cart",
        { p_items: items, p_district: "Dhaka", p_area: "Dhanmondi" },
        claims,
      ),
    );
    return JSON.parse(
      rpc(
        "place_order",
        { p_items: items, p_customer: customer, p_expected_total: quote.total },
        claims,
      ),
    ).order_number;
  };
  const delivered = place([
    "sample-bubble-candle-set-of-2",
    "sample-grid-notebook-a5",
  ]);
  const onTheWay = place([
    "sample-pleated-table-lamp",
    "sample-warm-fairy-lights",
    "sample-ceramic-pen-holder",
  ]);
  const steps = (number, statuses, startDaysAgo) => {
    sql(
      `with o as (select id from public.orders where order_number = ${literal(number)})
       update public.orders set created_at = now() - interval '${startDaysAgo} days' where id = (select id from o);
       update public.order_status_history set created_at = now() - interval '${startDaysAgo} days'
         where order_id = (select id from public.orders where order_number = ${literal(number)});
       insert into public.order_status_history (order_id, status, created_at)
         select o.id, s.status::public.order_status,
                now() - interval '${startDaysAgo} days' + (s.n * interval '9 hours')
         from public.orders o, unnest(${literal(`{${statuses.join(",")}}`)}::text[]) with ordinality s(status, n)
         where o.order_number = ${literal(number)};
       update public.orders set status = ${literal(statuses.at(-1))}::public.order_status
         where order_number = ${literal(number)}`,
    );
  };
  steps(
    delivered,
    [
      "confirmed",
      "packed",
      "handed_to_courier",
      "out_for_delivery",
      "delivered",
    ],
    9,
  );
  steps(onTheWay, ["confirmed", "packed", "handed_to_courier"], 2);
  sql(
    `update public.orders set courier_name = 'Pathao Courier', tracking_code = 'PT48213'
     where order_number = ${literal(onTheWay)}`,
  );
  for (const slug of [
    "sample-ribbed-ceramic-bud-vase",
    "sample-little-corner-gift-box",
    "sample-warm-fairy-lights",
  ]) {
    asRequester(
      claims,
      `insert into public.wishlists (product_id) select id from public.products where slug = ${literal(slug)} on conflict do nothing`,
    );
  }
  return { order: onTheWay, delivered, phone: DEMO_PHONE, email: DEMO_EMAIL };
}
