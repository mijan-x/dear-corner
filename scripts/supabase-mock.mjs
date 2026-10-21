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
import crypto, { randomInt } from "node:crypto";

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

function makeToken(user, aal = "aal1") {
  const now = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({
    sub: user.id,
    email: user.email,
    role: "authenticated",
    aud: "authenticated",
    aal,
    amr:
      aal === "aal2"
        ? [
            { method: "totp", timestamp: now },
            { method: "otp", timestamp: now },
          ]
        : [{ method: "otp", timestamp: now }],
    session_id: `mock-${user.id}`,
    iat: now,
    exp: now + 3600,
  })}.mock-signature`;
}

// Two-step login (TOTP) factors, per user, for this test run.
const factors = new Map();
const factorsOf = (userId) => factors.get(userId) ?? [];
function addFactor(userId, status = "unverified", name = "Authenticator") {
  const factor = {
    id: crypto.randomUUID(),
    friendly_name: name,
    factor_type: "totp",
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  factors.set(userId, [...factorsOf(userId), factor]);
  return factor;
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
const many = (fk) => ({ many: true, on: `c.${fk} = t.id` });
const one = (fk) => ({ many: false, on: `c.id = t.${fk}` });
const RELATIONS = {
  "orders.order_items": many("order_id"),
  "orders.order_status_history": many("order_id"),
  "orders.order_notes": many("order_id"),
  "order_items.orders": one("order_id"),
  "wishlists.products": one("product_id"),
  "products.product_variants": many("product_id"),
  "products.product_options": many("product_id"),
  "products.product_option_values": many("product_id"),
  "products.product_images": many("product_id"),
  "products.product_collections": many("product_id"),
  "categories.products": many("category_id"),
  "collections.product_collections": many("collection_id"),
  "coupons.coupon_categories": many("coupon_id"),
  "coupons.coupon_redemptions": many("coupon_id"),
  "shipping_zones.shipping_zone_areas": many("zone_id"),
  "product_variants.products": one("product_id"),
  "inventory_movements.products": one("product_id"),
  "reviews.products": one("product_id"),
  "reviews.orders": one("order_id"),
  "reviews.review_reports": many("review_id"),
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
  const star = items.includes("*");
  const pairs = items
    .filter((item) => item !== "*")
    .map((item) => {
      const nested = item.match(/^(\w+)\((.*)\)$/s);
      if (!nested) return `${literal(item)}, ${alias}.${ident(item)}`;
      const [, rel, inner] = nested;
      const relation = RELATIONS[`${table}.${rel}`];
      if (!relation) throw new Error(`no mock for relation ${table}.${rel}`);
      const childAlias = `c${alias.length}`;
      const on = relation.on
        .replaceAll("c.", `${childAlias}.`)
        .replaceAll("t.", `${alias}.`);
      if (inner.trim() === "count") {
        return `${literal(rel)}, jsonb_build_array(jsonb_build_object('count', (select count(*) from public.${ident(rel)} ${childAlias} where ${on})))`;
      }
      const json = selectJson(rel, childAlias, inner);
      return relation.many
        ? `${literal(rel)}, (select coalesce(jsonb_agg(${json}), '[]'::jsonb) from public.${ident(rel)} ${childAlias} where ${on})`
        : `${literal(rel)}, (select ${json} from public.${ident(rel)} ${childAlias} where ${on} limit 1)`;
    });
  const built = pairs.length ? `jsonb_build_object(${pairs.join(", ")})` : null;
  if (star)
    return built ? `(to_jsonb(${alias}) || ${built})` : `to_jsonb(${alias})`;
  return built ?? "'{}'::jsonb";
}

const RESERVED = new Set([
  "select",
  "order",
  "limit",
  "offset",
  "on_conflict",
  "columns",
]);

function condition(column, op, operand) {
  const col = `t.${ident(column)}`;
  const like = (v) => literal(v.replaceAll("*", "%"));
  switch (op) {
    case "eq":
      return `${col} = ${literal(operand)}`;
    case "neq":
      return `${col} <> ${literal(operand)}`;
    case "gt":
      return `${col} > ${literal(operand)}`;
    case "gte":
      return `${col} >= ${literal(operand)}`;
    case "lt":
      return `${col} < ${literal(operand)}`;
    case "lte":
      return `${col} <= ${literal(operand)}`;
    case "like":
      return `${col}::text like ${like(operand)}`;
    case "ilike":
      return `${col}::text ilike ${like(operand)}`;
    case "is":
      return `${col} is ${operand === "null" ? "null" : operand === "true" ? "true" : "false"}`;
    case "in": {
      const list = operand
        .replace(/^\(|\)$/g, "")
        .split(",")
        .map((v) => literal(v.replace(/^"|"$/g, "")));
      return `${col} in (${list.join(", ")})`;
    }
    default:
      throw new Error(`no mock for filter ${column}.${op}`);
  }
}

function whereClause(params) {
  const conditions = [];
  for (const [key, value] of params) {
    if (RESERVED.has(key)) continue;
    if (key === "or") {
      const parts = splitTop(value.replace(/^\(|\)$/g, "")).map((part) => {
        const [, column, op, operand] =
          part.match(/^(\w+)\.(\w+)\.(.*)$/s) ?? [];
        return condition(column, op, operand);
      });
      conditions.push(`(${parts.join(" or ")})`);
      continue;
    }
    const [, op, operand] = value.match(/^(\w+)\.(.*)$/s) ?? [];
    conditions.push(condition(key, op, operand));
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
    const counted = (headers["prefer"] ?? "").includes("count=exact");
    const out = asRequester(
      claims,
      `select jsonb_build_object('rows', coalesce(jsonb_agg(x.j), '[]'::jsonb),
         'total', ${counted ? `(select count(*) from public.${table} t ${where})` : "null"}) from (
         select ${selectJson(table, "t", select)} as j from public.${table} t
         ${where} ${orderClause(url.searchParams.get("order"))}
         ${limit ? `limit ${Number(limit)}` : ""} ${offset ? `offset ${Number(offset)}` : ""}
       ) x`,
    );
    const { rows: list0, total } = JSON.parse(out);
    const rows = JSON.stringify(list0);
    const from = Number(offset ?? 0);
    const range = counted
      ? {
          "content-range": `${list0.length ? `${from}-${from + list0.length - 1}` : "*"}/${total}`,
        }
      : {};
    if ((headers["accept"] ?? "").includes("vnd.pgrst.object")) {
      const list = JSON.parse(rows);
      return list.length === 1
        ? { status: 200, body: JSON.stringify(list[0]), headers: range }
        : {
            status: 406,
            body: JSON.stringify({
              code: "PGRST116",
              message: "JSON object requested, multiple (or no) rows returned",
            }),
          };
    }
    return { status: 200, body: rows, headers: range };
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
  if (wantsRows && (headers["accept"] ?? "").includes("vnd.pgrst.object")) {
    const list = JSON.parse(rows);
    return list.length === 1
      ? { status: method === "POST" ? 201 : 200, body: JSON.stringify(list[0]) }
      : {
          status: 406,
          body: JSON.stringify({
            code: "PGRST116",
            message: "JSON object requested, multiple (or no) rows returned",
          }),
        };
  }
  return wantsRows
    ? { status: method === "POST" ? 201 : 200, body: rows }
    : { status: method === "POST" ? 201 : 204, body: "" };
}

// --------------------------------------------------------------------------
// Email sign-in (/auth/v1/...)
// --------------------------------------------------------------------------
/** Passwords set with "Set a password" (email -> password), in memory. */
const passwords = new Map();

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
    factors: factorsOf(user.id),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** A session object as Supabase returns it (and stores it in the browser). */
export function sessionFor(email, { aal = "aal1" } = {}) {
  const user = ensureUser(email);
  return sessionOf(user, aal);
}

function sessionOf(user, aal) {
  return {
    access_token: makeToken(user, aal),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `refresh-${aal}-${user.id}`,
    user: userJson(user),
  };
}

/** Gives `email` the admin role (two-step login still to set up). */
export function setAdminRole(email) {
  const user = ensureUser(email);
  sql(
    `update public.user_roles set role = 'admin' where user_id = ${literal(user.id)}`,
  );
  return user;
}

/** Makes `email` an admin who has already set up two-step login. */
export function makeAdmin(email) {
  const user = ensureUser(email);
  sql(
    `update public.user_roles set role = 'admin' where user_id = ${literal(user.id)}`,
  );
  if (!factorsOf(user.id).some((f) => f.status === "verified"))
    addFactor(user.id, "verified");
  return user;
}

/** The localStorage entry that makes the browser signed in as `email`. */
export function sessionStorageEntry(supabaseUrl, email, { aal = "aal1" } = {}) {
  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  return {
    key: `sb-${ref}-auth-token`,
    value: JSON.stringify(sessionFor(email, { aal })),
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
  if (
    path === "token" &&
    method === "POST" &&
    url.searchParams.get("grant_type") === "password"
  ) {
    const address = String(body.email ?? "")
      .trim()
      .toLowerCase();
    if (!address || passwords.get(address) !== body.password) {
      return {
        status: 400,
        body: JSON.stringify({
          code: 400,
          error_code: "invalid_credentials",
          msg: "Invalid login credentials",
        }),
      };
    }
    return { status: 200, body: JSON.stringify(sessionFor(address)) };
  }
  if (path === "token" && method === "POST") {
    const [, aal = "aal1", id = ""] =
      String(body.refresh_token ?? "").match(/^refresh-(aal[12])-(.*)$/) ?? [];
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
    return { status: 200, body: JSON.stringify(sessionFor(email, { aal })) };
  }
  // Two-step login: enroll, challenge, verify (code 123456), remove.
  const factorPath = path.match(
    /^factors(?:\/([0-9a-f-]+))?(?:\/(challenge|verify))?$/,
  );
  if (factorPath) {
    if (!claims)
      return {
        status: 401,
        body: JSON.stringify({ code: 401, msg: "No session" }),
      };
    const [, factorId, step] = factorPath;
    if (!factorId && method === "POST") {
      const f = addFactor(
        claims.sub,
        "unverified",
        body.friendly_name ?? "Authenticator",
      );
      const secret = "JBSWY3DPEHPK3PXP";
      return {
        status: 200,
        body: JSON.stringify({
          id: f.id,
          type: "totp",
          friendly_name: f.friendly_name,
          totp: {
            qr_code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21"><rect width="21" height="21" fill="#fff"/><path d="M1 1h7v7H1zM13 1h7v7h-7zM1 13h7v7H1zM10 10h2v2h-2zM14 14h3v3h-3z" fill="#241b22"/></svg>`,
            secret,
            uri: `otpauth://totp/Dear%20Corner:${claims.email}?secret=${secret}&issuer=Dear%20Corner`,
          },
        }),
      };
    }
    if (factorId && step === "challenge") {
      return {
        status: 200,
        body: JSON.stringify({
          id: crypto.randomUUID(),
          type: "totp",
          expires_at: Math.floor(Date.now() / 1000) + 300,
        }),
      };
    }
    if (factorId && step === "verify") {
      if (String(body.code ?? "") !== MOCK_OTP_CODE) {
        return {
          status: 422,
          body: JSON.stringify({
            code: 422,
            error_code: "mfa_verification_failed",
            msg: "Invalid TOTP code entered",
          }),
        };
      }
      factors.set(
        claims.sub,
        factorsOf(claims.sub).map((f) =>
          f.id === factorId ? { ...f, status: "verified" } : f,
        ),
      );
      return {
        status: 200,
        body: JSON.stringify(
          sessionOf({ id: claims.sub, email: claims.email }, "aal2"),
        ),
      };
    }
    if (factorId && method === "DELETE") {
      factors.set(
        claims.sub,
        factorsOf(claims.sub).filter((f) => f.id !== factorId),
      );
      return { status: 200, body: JSON.stringify({ id: factorId }) };
    }
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
  if (path === "user" && method === "PUT") {
    if (!claims)
      return {
        status: 401,
        body: JSON.stringify({ code: 401, msg: "No session" }),
      };
    if (typeof body.password === "string") {
      if (passwords.get(claims.email) === body.password) {
        return {
          status: 422,
          body: JSON.stringify({
            code: 422,
            error_code: "same_password",
            msg: "New password should be different from the old password.",
          }),
        };
      }
      passwords.set(claims.email, body.password);
    }
    return {
      status: 200,
      body: JSON.stringify(userJson({ id: claims.sub, email: claims.email })),
    };
  }
  if (path === "logout") return { status: 204, body: "" };
  throw new Error(`no mock for auth ${method} ${path}${url.search}`);
}

// --------------------------------------------------------------------------
// Storage: uploads are kept in memory and served back for this test run.
// --------------------------------------------------------------------------
const files = new Map();

function fileFromMultipart(buffer, contentType) {
  const boundary = contentType
    .match(/boundary=(?:"([^"]+)"|([^;]+))/)
    ?.slice(1)
    .find(Boolean);
  if (!boundary) return buffer;
  const parts = buffer.toString("latin1").split(`--${boundary}`);
  for (const part of parts) {
    const [head, ...rest] = part.split("\r\n\r\n");
    if (/content-type:\s*image\//i.test(head) || /filename=/i.test(head)) {
      return Buffer.from(rest.join("\r\n\r\n").replace(/\r\n$/, ""), "latin1");
    }
  }
  return buffer;
}

function storageRequest(method, path, request, body) {
  if (method === "GET") {
    const key = path.replace(/^(public|authenticated)\//, "");
    const file = files.get(key);
    return file
      ? { status: 200, body: file, contentType: "image/webp", headers: {} }
      : { status: 404, body: JSON.stringify({ message: "Object not found" }) };
  }
  if (method === "POST" || method === "PUT") {
    const data = request.postDataBuffer() ?? Buffer.alloc(0);
    files.set(
      path,
      fileFromMultipart(data, request.headers()["content-type"] ?? ""),
    );
    return {
      status: 200,
      body: JSON.stringify({ Key: path, Id: crypto.randomUUID() }),
    };
  }
  if (method === "DELETE") {
    const bucket = path.replace(/\/$/, "");
    for (const prefix of body?.prefixes ?? [])
      files.delete(`${bucket}/${prefix}`);
    return { status: 200, body: "[]" };
  }
  throw new Error(`no mock for storage ${method} ${path}`);
}

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
      const auth = url.pathname.match(/^\/auth\/v1\/(.+)$/);
      const storage = url.pathname.match(/^\/storage\/v1\/object\/(.+)$/);
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
      else if (storage)
        result = storageRequest(method, storage[1], request, body);
      else throw new Error(`unexpected request ${method} ${url.pathname}`);
      log?.(`${method} ${url.pathname} ${result.status}`);
      await route.fulfill({
        status: result.status,
        contentType: result.contentType ?? "application/json",
        body: result.body,
        headers: {
          ...headers,
          ...(result.headers ?? {}),
          "access-control-expose-headers": "content-range",
        },
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
export const DEMO_ADMIN = "dearcorner.bd@gmail.com";
export const DEMO_NEW_ADMIN = "new-admin@example.com";

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
  // For the admin screenshots: an admin with two-step login, a coupon and a
  // message from the contact page (test database only).
  makeAdmin(DEMO_ADMIN);
  setAdminRole(DEMO_NEW_ADMIN);
  sql(`insert into public.coupons (code, description, type, value, min_subtotal, usage_limit)
       values ('WELCOME10', 'First order', 'percent', 10, 500, 200) on conflict do nothing`);
  sql(`insert into public.contact_messages (name, phone, email, order_number, message)
       values ('Nabila Hasan', '01812345678', 'nabila@example.com', ${literal(onTheWay)},
               'Hi! Can the courier come after 5 pm? I am at work until then.')`);
  return {
    order: onTheWay,
    delivered,
    phone: DEMO_PHONE,
    email: DEMO_EMAIL,
    orderId: sql(
      `select id from public.orders where order_number = ${literal(onTheWay)}`,
    ),
    productId: sql(
      "select id from public.products where slug = 'sample-pleated-table-lamp'",
    ),
  };
}
