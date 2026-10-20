// Takes full-page screenshots of every route in screenshot-routes.json at each
// viewport, and records console errors and failed requests.
// Usage: node scripts/screenshots.mjs <base-url> <out-dir>
// Set PLAYWRIGHT_MODULE to load Playwright from a custom path.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [, , baseUrl = "http://localhost:4173", outDir = "ci-out/screenshots"] =
  process.argv;
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const config = JSON.parse(
  await readFile(new URL("./screenshot-routes.json", import.meta.url), "utf8"),
);

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {},
);
const report = [];

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
  for (const route of config.routes) {
    const page = await context.newPage();
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
    await page.goto(new URL(route.path, baseUrl).href, {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(route.wait ?? 900);
    const file = path.join(outDir, `${route.name}-${viewport.name}.png`);
    await page.screenshot({
      path: file,
      fullPage: route.fullPage !== false,
      animations: "disabled",
    });
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    report.push({
      route: route.path,
      viewport: viewport.name,
      file: path.basename(file),
      ms: Date.now() - started,
      horizontalOverflow: scrollWidth > viewport.width,
      problems,
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
  ]
    .filter(Boolean)
    .join(", ");
  console.log(
    `${row.viewport.padStart(4)}  ${row.route.padEnd(32)} ${row.ms}ms ${flags}`,
  );
  for (const p of row.problems) console.log(`      ${p}`);
}
