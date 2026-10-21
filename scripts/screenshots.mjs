// Takes screenshots of every route in screenshot-routes.json at each
// viewport, records console errors, failed requests and horizontal overflow,
// and (when axe-core is installed) runs an accessibility scan.
// Usage: node scripts/screenshots.mjs <base-url> <out-dir>
// Set PLAYWRIGHT_MODULE to load Playwright from a custom path.
//
// A route can list `actions` to reach a state before the capture (open the
// menu, hover the Shop panel): [{ "click" | "hover": "<selector>" } |
// { "fill": "<selector>", "value": "lamp" } | { "wait": 300 }].
//
// With SUPABASE_MOCK_URL set (the build's VITE_SUPABASE_URL), shop data comes
// from the local test database instead (scripts/supabase-mock.mjs), with a
// demo customer and orders. Then a route can also set:
//   "session": true          signed in as the demo customer
//   "cart": ["<slug>", ...]  those products in the cart
//   "admin": true            signed in to the admin (two-step login done);
//            "enroll"        an admin who still has to set up two-step login
// and use {order}, {delivered}, {phone}, {orderId} and {productId} in its
// path and action values.
// Routes that need these are skipped without the mock.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const [, , baseUrl = "http://localhost:4173", outDir = "ci-out/screenshots"] =
  process.argv;
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const config = JSON.parse(
  await readFile(new URL("./screenshot-routes.json", import.meta.url), "utf8"),
);

let axeSource = null;
try {
  const require = createRequire(import.meta.url);
  axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
} catch {
  console.log("axe-core not installed: skipping the accessibility scan");
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {},
);
const report = [];
const mockUrl = process.env.SUPABASE_MOCK_URL;
const mock = mockUrl ? await import("./supabase-mock.mjs") : null;
if (mock) console.log(`Shop data from the local test database (${mockUrl})`);
const demo = mock ? mock.prepareDemoData() : null;
const fill = (value) =>
  typeof value === "string" && demo
    ? value.replace(
        /\{(order|delivered|phone|orderId|productId)\}/g,
        (_, key) => demo[key],
      )
    : value;

async function runActions(page, actions = []) {
  for (const action of actions) {
    if (action.click) await page.click(action.click);
    else if (action.hover) await page.hover(action.hover);
    else if (action.fill)
      await page.fill(action.fill, fill(action.value ?? ""));
    else if (action.select)
      await page.selectOption(action.select, action.value);
    else if (action.press) await page.keyboard.press(action.press);
    if (action.wait) await page.waitForTimeout(action.wait);
    else await page.waitForTimeout(350);
  }
}

// A full-page capture shows parts of the page that are far below the
// screen; lazy images there would still be empty. Load them all first.
async function loadAllImages(page) {
  await page.evaluate(async () => {
    const images = [...document.images];
    for (const img of images) img.loading = "eager";
    await Promise.race([
      Promise.all(
        images
          .filter((img) => img.getClientRects().length > 0 && !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.addEventListener("load", resolve, { once: true });
                img.addEventListener("error", resolve, { once: true });
              }),
          ),
      ),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
    // Loaded isn't painted: wait for decoding too.
    await Promise.all(
      images
        .filter((img) => img.complete && img.naturalWidth > 0)
        .map((img) => img.decode().catch(() => {})),
    );
  });
}

async function scan(page) {
  if (!axeSource) return null;
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
    }));
  });
  return result;
}

for (const viewport of config.viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width < 768,
    hasTouch: viewport.width < 768,
    // Final (settled) state of entrance animations; full-page capture resizes
    // the viewport, which would otherwise restart them mid-capture.
    reducedMotion: "reduce",
  });
  if (mock) await mock.mockSupabase(context, mockUrl);
  for (const route of config.routes) {
    if (route.viewports && !route.viewports.includes(viewport.name)) continue;
    if ((route.session || route.cart || route.admin) && !mock) continue;
    // SHOT_FILTER=admin takes only the routes whose name contains "admin".
    if (
      process.env.SHOT_FILTER &&
      !route.name.includes(process.env.SHOT_FILTER)
    )
      continue;
    const page = await context.newPage();
    // Each route starts from a clean browser: signed in and with a cart only
    // when it asks for them.
    const storage = {};
    if (route.session) {
      const entry = mock.sessionStorageEntry(mockUrl, demo.email);
      storage[entry.key] = entry.value;
    }
    if (route.admin) {
      const entry =
        route.admin === "enroll"
          ? mock.sessionStorageEntry(mockUrl, mock.DEMO_NEW_ADMIN)
          : mock.sessionStorageEntry(mockUrl, mock.DEMO_ADMIN, { aal: "aal2" });
      storage[entry.key] = entry.value;
    }
    if (route.cart) {
      storage["dc-cart-v1"] = JSON.stringify(
        mock
          .variantsFor(route.cart)
          .map((variantId) => ({ variantId, quantity: 1 })),
      );
    }
    await page.addInitScript(() => {
      window.print = () => {};
    });
    await page.addInitScript((entries) => {
      if (sessionStorage.getItem("dc-shot-ready")) return;
      localStorage.clear();
      for (const [key, value] of Object.entries(entries))
        localStorage.setItem(key, value);
      sessionStorage.setItem("dc-shot-ready", "1");
    }, storage);
    const problems = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") problems.push(`console: ${msg.text()}`);
    });
    page.on("pageerror", (error) =>
      problems.push(`pageerror: ${error.message}`),
    );
    page.on("requestfailed", (request) =>
      problems.push(
        `requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`,
      ),
    );
    const started = Date.now();
    try {
      await page.goto(new URL(fill(route.path), baseUrl).href, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(route.wait ?? 900);
      if (route.fullPage !== false) await loadAllImages(page);
      await runActions(page, route.actions);
    } catch (error) {
      problems.push(`navigation/action: ${error.message.split("\n")[0]}`);
    }
    const file = path.join(outDir, `${route.name}-${viewport.name}.png`);
    await page.screenshot({
      path: file,
      fullPage: route.fullPage !== false,
      animations: "disabled",
    });
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    let violations = null;
    try {
      violations = await scan(page);
    } catch (error) {
      problems.push(`axe: ${error.message.split("\n")[0]}`);
    }
    report.push({
      route: route.path,
      name: route.name,
      viewport: viewport.name,
      file: path.basename(file),
      ms: Date.now() - started,
      horizontalOverflow: scrollWidth > viewport.width,
      problems,
      violations,
    });
    await page.close();
  }
  await context.close();
}

await browser.close();
await writeFile(
  path.join(outDir, "report.json"),
  JSON.stringify(report, null, 2),
);
for (const row of report) {
  const flags = [
    row.horizontalOverflow ? "OVERFLOW" : "",
    row.problems.length ? `${row.problems.length} problem(s)` : "",
    row.violations?.length ? `${row.violations.length} a11y issue(s)` : "",
  ]
    .filter(Boolean)
    .join(", ");
  console.log(
    `${row.viewport.padStart(4)}  ${row.name.padEnd(24)} ${row.ms}ms ${flags}`,
  );
  for (const p of row.problems) console.log(`      ${p}`);
  for (const v of row.violations ?? []) {
    console.log(
      `      a11y ${v.impact} ${v.id} (${v.nodes}): ${v.help} — ${v.targets.join(" | ")}`,
    );
  }
}
