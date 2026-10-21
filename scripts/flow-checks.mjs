// End-to-end checks of the buying flow against the local test database
// (scripts/supabase-mock.mjs): cart, checkout, confirmation, track order,
// email sign-in, account pages, wishlist, reviews and the server's price
// checks. Changes data in that database, so run it on a throwaway copy.
// Usage: SUPABASE_MOCK_URL=https://mock-project.supabase.co PGPORT=54331 \
//   node scripts/flow-checks.mjs <base-url> [out-file]
import { writeFile } from "node:fs/promises";

const [, , baseUrl = "http://localhost:4173", outFile] = process.argv;
const mockUrl = process.env.SUPABASE_MOCK_URL;
if (!mockUrl)
  throw new Error("Set SUPABASE_MOCK_URL (the build's Supabase URL).");
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const mock = await import("./supabase-mock.mjs");
const { sql, MOCK_OTP_CODE } = mock;

const LAMP = "/products/sample-pleated-table-lamp";
const CANDLES = "/products/sample-bubble-candle-set-of-2";
const results = [];
// A new customer each run.
const EMAIL = `tanvir.${Date.now()}@example.com`;
let failures = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  if (!ok) failures += 1;
  console.log(
    `${ok ? "pass" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`,
  );
}

async function step(name, fn) {
  try {
    await fn();
  } catch (error) {
    check(name, false, error.message.split("\n")[0]);
  }
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {},
);

async function newPage(viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
  });
  await mock.mockSupabase(context, mockUrl, {
    log: (line) => {
      if (/ (4\d\d|5\d\d)$| ERROR /.test(line))
        console.log(`      mock ${line}`);
    },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // Failed requests the checks cause on purpose (a wrong code) are fine.
    if (
      m.type() === "error" &&
      !m.text().startsWith("Failed to load resource")
    ) {
      errors.push(m.text());
    }
  });
  return { context, page, errors };
}

const go = (page, path) =>
  page.goto(new URL(path, baseUrl).href, { waitUntil: "networkidle" });
const text = (page, selector) => page.locator(selector).first().innerText();
const cartCount = (page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("dc-cart-v1") || "[]").reduce(
      (s, l) => s + l.quantity,
      0,
    ),
  );

async function fillAddress(
  page,
  prefix,
  { district = "Dhaka", area = "Dhanmondi" } = {},
) {
  await page.selectOption(`#${prefix}-division`, "Dhaka");
  await page.selectOption(`#${prefix}-district`, district);
  await page.selectOption(`#${prefix}-area`, area);
  await page.fill(`#${prefix}-address`, "House 12, Road 5");
}

async function addToCart(page, path) {
  await go(page, path);
  // Pick the first in-stock option when the product has options.
  const option = page
    .locator("main fieldset label:not(:has(input:disabled))")
    .first();
  if (await option.count()) await option.click();
  await page.locator("main button:has-text('Add to cart')").first().click();
  await page.waitForTimeout(400);
}

// ---------------------------------------------------------------------------
// Guest: cart drawer, cart page, checkout validation, order, confirmation
// ---------------------------------------------------------------------------
let guestOrder = null;
await step("guest buy flow", async () => {
  const { context, page, errors } = await newPage();
  await addToCart(page, LAMP);
  const drawer = page.locator("dialog[open]");
  check("add to cart opens the cart drawer", await drawer.isVisible());
  check(
    "drawer shows the item",
    (await drawer.innerText()).includes("Pleated"),
  );
  check(
    "drawer has Checkout",
    await drawer.locator("a:has-text('Checkout')").isVisible(),
  );
  check("badge count is 1", (await cartCount(page)) === 1);
  await page.keyboard.press("Escape");

  await go(page, "/cart");
  check("cart page heading", (await text(page, "h1")).includes("Your cart"));
  // Quantity +1 then coupon.
  await page.locator("main button[aria-label^='Increase']").first().click();
  await page.waitForTimeout(600);
  check("quantity goes up", (await cartCount(page)) === 2);
  sql(
    "insert into public.coupons (code, type, value, min_subtotal) values ('HELLO10', 'percent', 10, 0) on conflict do nothing",
  );
  await page.fill("main input[placeholder^='e.g.']", "hello10");
  await page.locator("main button:has-text('Apply')").first().click();
  await page.waitForTimeout(900);
  check(
    "coupon applies",
    (await page.locator("main").innerText()).includes("HELLO10 applied"),
  );

  await go(page, "/checkout");
  check("checkout heading", (await text(page, "h1")) === "Checkout");
  check(
    "cash on delivery selected",
    await page.locator("input[value='cash_on_delivery']").isChecked(),
  );
  // Empty submit: errors, focus on name.
  await page.locator("button[form='checkout-form']:visible").click();
  await page.waitForTimeout(300);
  check(
    "empty form shows errors",
    (await page.locator("[aria-invalid='true']").count()) >= 4,
  );
  check(
    "focus moves to the first error",
    (await page.evaluate(() => document.activeElement?.id)) === "checkout-name",
  );
  await page.fill("#checkout-name", "Rima Akter");
  await page.fill("#checkout-phone", "0171234567"); // 10 digits
  await fillAddress(page, "checkout");
  await page.locator("button[form='checkout-form']:visible").click();
  await page.waitForTimeout(300);
  check(
    "short phone is rejected",
    (await page.locator("#checkout-phone").getAttribute("aria-invalid")) ===
      "true",
  );
  await page.fill("#checkout-phone", "01712345678");
  await page.waitForTimeout(1200);
  const main = await page.locator("main").innerText();
  check("delivery zone shows", main.includes("Inside Dhaka"));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);
  const label = await page
    .locator("aside button:has-text('Place order')")
    .innerText();
  check(
    "button shows the real total",
    /^Place order · ৳[\d,]+$/.test(label.trim()),
    label.trim(),
  );
  await page.locator("aside button:has-text('Place order')").click();
  await page.waitForURL(/\/order-confirmed\//, { timeout: 10000 });
  await page.waitForSelector("main h1:has-text('Thank you')", {
    timeout: 10000,
  });
  const confirmation = await page.locator("main").innerText();
  guestOrder = page.url().split("/").pop();
  check("order number format", /^DC-\d{5,}$/.test(guestOrder), guestOrder);
  check(
    "thank-you message",
    (await text(page, "main h1")) === "Thank you, Rima!",
    await text(page, "main h1"),
  );
  check(
    "owner's message",
    confirmation.includes(
      `We’ve got your order #${guestOrder}. We’ll call you soon to confirm it.`,
    ) ||
      confirmation.includes(
        `We've got your order #${guestOrder}. We'll call you soon to confirm it.`,
      ),
  );
  if (!confirmation.includes("call you soon"))
    console.log(confirmation.slice(0, 400));
  check("cart is empty after ordering", (await cartCount(page)) === 0);
  check(
    "coupon is cleared",
    (await page.evaluate(() => localStorage.getItem("dc-coupon"))) === '""',
  );
  const saved = sql(
    `select jsonb_build_object('total', total, 'discount', discount, 'fee', delivery_fee, 'coupon', coupon_code) from public.orders where order_number = '${guestOrder}'`,
  );
  const o = JSON.parse(saved);
  check(
    "server totals: 2 lamps, 10% off, free delivery",
    o.discount === 378 &&
      o.fee === 0 &&
      o.total === 3402 &&
      o.coupon === "HELLO10",
    saved,
  );
  check("no page errors (guest)", errors.length === 0, errors.join(" | "));
  await context.close();
});

// ---------------------------------------------------------------------------
// Track order
// ---------------------------------------------------------------------------
await step("track order", async () => {
  const { context, page } = await newPage();
  await go(page, `/track-order?order=${guestOrder}`);
  check(
    "order number prefilled",
    (await page.inputValue("#track-number")) === guestOrder,
  );
  await page.fill("#track-phone", "01799999999");
  await page.locator("main button:has-text('Track order')").click();
  await page.waitForTimeout(800);
  check(
    "wrong phone: not found message",
    (await page.locator("main").innerText()).includes(
      "We couldn't find that order.",
    ),
  );
  await page.fill("#track-phone", "+880 1712-345678");
  await page.locator("main button:has-text('Track order')").click();
  await page.waitForSelector("#track-result", { timeout: 5000 });
  const result = await page.locator("#track-result").innerText();
  check(
    "status timeline shows",
    result.includes("Handed to courier") && result.includes("Placed"),
  );
  check("street address is hidden", !result.includes("House 12"));
  await context.close();
});

// ---------------------------------------------------------------------------
// Price changed between quote and order
// ---------------------------------------------------------------------------
await step("price change", async () => {
  const { context, page } = await newPage({ width: 1280, height: 900 });
  await addToCart(page, CANDLES);
  await go(page, "/checkout");
  await page.fill("#checkout-name", "Nabila Hasan");
  await page.fill("#checkout-phone", "01812345678");
  await fillAddress(page, "checkout", {
    district: "Gazipur",
    area: "Gazipur Sadar",
  });
  await page.waitForTimeout(1200);
  const before = await page
    .locator("aside button:has-text('Place order')")
    .innerText();
  sql(
    "update public.product_variants set price = price + 50 where sku = (select sku from public.product_variants v join public.products p on p.id = v.product_id where p.slug = 'sample-bubble-candle-set-of-2' limit 1)",
  );
  await page.locator("aside button:has-text('Place order')").click();
  await page.waitForTimeout(1500);
  const after = await page
    .locator("aside button:has-text('Place order')")
    .innerText();
  check("price change stops the order", page.url().endsWith("/checkout"));
  check(
    "price change message",
    (await page.locator("main").innerText()).includes("Prices changed"),
  );
  check("total updates", before !== after, `${before} → ${after}`);
  await page.locator("aside button:has-text('Place order')").click();
  await page.waitForURL(/\/order-confirmed\//, { timeout: 10000 });
  check("order goes through with the new total", true);
  await context.close();
});

// ---------------------------------------------------------------------------
// Sign in, account, signed-in checkout with a saved address
// ---------------------------------------------------------------------------
let accountOrder = null;
await step("account flow", async () => {
  const { context, page, errors } = await newPage();
  await go(page, "/account");
  check(
    "account asks to sign in",
    page.url().includes("/account/sign-in?next=%2Faccount"),
  );
  await page.fill("input[type='email']", EMAIL);
  await page.locator("main button:has-text('Email me a code')").click();
  await page.waitForSelector("#sign-in-code");
  check("code step", (await text(page, "h1")) === "Check your email");
  await page.fill("#sign-in-code", "000000");
  await page.locator("main button:has-text('Sign in')").click();
  await page.waitForTimeout(800);
  check(
    "wrong code message",
    (await page.locator("main").innerText()).includes("That code didn't work."),
  );
  await page.fill("#sign-in-code", MOCK_OTP_CODE);
  await page.locator("main button:has-text('Sign in')").click();
  await page.waitForURL((url) => url.pathname === "/account", {
    timeout: 8000,
  });
  await page.waitForTimeout(800);
  check("signed in to orders", (await text(page, "main h1")) === "Your orders");
  check(
    "empty orders",
    (await page.locator("main").innerText()).includes("No orders yet."),
  );

  // Profile
  await go(page, "/account/profile");
  await page.fill("main input[autocomplete='name']", "Tanvir Ahmed");
  await page.fill("main input[type='tel']", "01912345678");
  await page.locator("main button:has-text('Save profile')").click();
  await page.waitForTimeout(800);
  check(
    "profile saved",
    sql(
      `select p.full_name || ' ' || p.phone from public.profiles p join auth.users u on u.id = p.id where u.email = '${EMAIL}'`,
    ) === "Tanvir Ahmed 01912345678",
  );

  // Signed-in checkout: name and phone come from the profile.
  await addToCart(page, CANDLES);
  await go(page, "/checkout");
  await page.waitForTimeout(600);
  check(
    "name prefilled from profile",
    (await page.inputValue("#checkout-name")) === "Tanvir Ahmed",
  );
  await fillAddress(page, "checkout", { district: "Dhaka", area: "Mirpur" });
  check(
    "save address offered",
    await page.locator("text=Save this address for next time").isVisible(),
  );
  await page.waitForTimeout(1200);
  await page.locator("button[form='checkout-form']:visible").click();
  await page.waitForURL(/\/order-confirmed\//, { timeout: 10000 });
  accountOrder = page.url().split("/").pop();
  check("signed-in order placed", /^DC-\d+$/.test(accountOrder));
  check(
    "order belongs to the account",
    sql(
      `select (user_id is not null)::text from public.orders where order_number = '${accountOrder}'`,
    ) === "true",
  );

  await go(page, "/account");
  await page.waitForTimeout(800);
  const orders = await page.locator("main").innerText();
  check(
    "order in the list with status",
    orders.includes(accountOrder) && orders.includes("Placed"),
  );

  await go(page, "/account/addresses");
  await page.waitForTimeout(800);
  const addresses = await page.locator("main").innerText();
  check(
    "address was saved as default",
    addresses.includes("Mirpur") && addresses.includes("Default"),
  );

  // Next checkout picks the saved address.
  await addToCart(page, CANDLES);
  await go(page, "/checkout");
  await page.waitForTimeout(1200);
  check(
    "saved address preselected",
    await page.locator("input[name='saved-address']").first().isChecked(),
  );
  check(
    "no details form with a saved address",
    (await page.locator("#checkout-name").count()) === 0,
  );

  // Add a second address in the account.
  await go(page, "/account/addresses");
  await page.locator("main button:has-text('Add an address')").first().click();
  await page.fill("#address-label", "Office");
  await page.fill("#address-name", "Tanvir Ahmed");
  await page.fill("#address-phone", "01912345678");
  await fillAddress(page, "address", { district: "Dhaka", area: "Gulshan" });
  await page.locator("dialog button:has-text('Save address')").click();
  await page.waitForTimeout(900);
  check(
    "second address added",
    (await page.locator("main").innerText()).includes("Office"),
  );

  // Wishlist
  await go(page, LAMP);
  await page
    .locator("main button[aria-label^='Save '][aria-label$='wishlist']")
    .click();
  await page.waitForTimeout(800);
  check(
    "heart is on",
    (await page
      .locator("main button[aria-pressed='true'][aria-label*='wishlist']")
      .count()) === 1,
  );
  await go(page, "/account/wishlist");
  await page.waitForTimeout(800);
  check(
    "wishlist shows the lamp",
    (await page.locator("main").innerText()).includes("Pleated"),
  );

  // Delivered order: review it.
  sql(`update public.orders set status = 'delivered' where order_number = '${accountOrder}';
       insert into public.order_status_history (order_id, status)
       select id, s::public.order_status from public.orders,
         unnest(array['confirmed','packed','handed_to_courier','out_for_delivery','delivered']) s
       where order_number = '${accountOrder}'`);
  await go(page, `/account/orders/${accountOrder}`);
  await page.waitForTimeout(900);
  check(
    "delivered order shows Write a review",
    await page.locator("main button:has-text('Write a review')").isVisible(),
  );
  await page.locator("main button:has-text('Write a review')").click();
  await page.locator("dialog button:has-text('Send review')").click();
  await page.waitForTimeout(300);
  check(
    "review needs a rating",
    (await page.locator("dialog[open]").innerText()).includes(
      "Choose a rating",
    ),
  );
  await page.locator("dialog label:has(input[value='5'])").click();
  await page.fill(
    "dialog textarea",
    "Smells lovely and looks cute on my desk.",
  );
  await page.locator("dialog button:has-text('Send review')").click();
  await page.waitForTimeout(1000);
  check(
    "review sent",
    (await page.locator("dialog[open]").innerText()).includes(
      "Your review is with us",
    ),
  );
  check(
    "review waits for approval",
    sql(
      "select status from public.reviews order by created_at desc limit 1",
    ) === "pending",
  );
  await page.locator("dialog button:has-text('Done')").click();
  await page.waitForTimeout(400);
  check(
    "item says review sent",
    (await page.locator("main").innerText()).includes("Review sent"),
  );

  // Reorder
  await go(page, "/account");
  await page.waitForTimeout(800);
  const beforeReorder = await cartCount(page);
  await page.locator("main button:has-text('Reorder')").first().click();
  await page.waitForTimeout(500);
  check(
    "reorder fills the cart and opens it",
    (await cartCount(page)) > beforeReorder &&
      (await page.locator("dialog[open]").count()) === 1,
  );
  await page.keyboard.press("Escape");

  // Sign out clears this browser's cart.
  await page
    .locator(
      "main button:has-text('Sign out'), nav[aria-label='Account'] button:has-text('Sign out')",
    )
    .first()
    .click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 8000 });
  await page.waitForTimeout(800);
  check("signed out, cart cleared here", (await cartCount(page)) === 0);
  check("no page errors (account)", errors.length === 0, errors.join(" | "));
  await context.close();
});

// The cart follows the customer to a new device.
await step("cart sync", async () => {
  const { context, page } = await newPage();
  await go(page, "/account/sign-in");
  await page.fill("input[type='email']", EMAIL);
  await page.locator("main button:has-text('Email me a code')").click();
  await page.fill("#sign-in-code", MOCK_OTP_CODE);
  await page.locator("main button:has-text('Sign in')").click();
  await page.waitForURL((url) => url.pathname === "/account", {
    timeout: 8000,
  });
  await page.waitForTimeout(1200);
  check("saved cart comes back after signing in", (await cartCount(page)) > 0);
  await context.close();
});

// ---------------------------------------------------------------------------
// Admin: access, two-step login, orders, catalog, stock, coupons, shipping,
// reviews, messages, settings
// ---------------------------------------------------------------------------
const ADMIN = `owner.${Date.now()}@example.com`;
await step("admin", async () => {
  const { context, page, errors } = await newPage({ width: 1280, height: 900 });
  await context.addInitScript(() => {
    window.print = () => {
      window.__printed = true;
    };
  });
  const signIn = async (email) => {
    await go(page, "/account/sign-in?next=%2Fadmin");
    await page.fill("input[type='email']", email);
    await page.locator("main button:has-text('Email me a code')").click();
    await page.fill("#sign-in-code", MOCK_OTP_CODE);
    await page.locator("main button:has-text('Sign in')").click();
    await page.waitForURL((url) => url.pathname.startsWith("/admin"), {
      timeout: 8000,
    });
    await page.waitForTimeout(800);
  };
  // A customer account can't get in.
  await signIn(`shopper.${Date.now()}@example.com`);
  check(
    "customers can't open the admin",
    (await page.locator("body").innerText()).includes(
      "This page is for the shop team",
    ),
  );
  await page.evaluate(() => localStorage.clear());

  // The owner sets up two-step login, then gets in.
  mock.setAdminRole(ADMIN);
  await signIn(ADMIN);
  check(
    "admin must turn on two-step login",
    (await text(page, "h1")) === "Turn on two-step login",
  );
  check("QR code shown", await page.locator("img[alt^='QR code']").isVisible());
  await page.fill("#admin-code", "000000");
  await page.locator("button:has-text('Turn on and continue')").click();
  await page.waitForTimeout(700);
  check(
    "wrong code refused",
    (await page.locator("body").innerText()).includes("That code didn't work"),
  );
  await page.fill("#admin-code", MOCK_OTP_CODE);
  await page.locator("button:has-text('Turn on and continue')").click();
  await page.waitForSelector("main h1:has-text('Dashboard')", {
    timeout: 8000,
  });
  check("dashboard after two-step login", true);
  check(
    "dashboard shows waiting orders",
    (await page.locator("main").innerText()).includes("Waiting for a call"),
  );

  // Orders: find the guest order, confirm, pack, hand to courier.
  await go(page, "/admin/orders");
  await page.waitForTimeout(800);
  check(
    "orders list shows the guest order",
    (await page.locator("main").innerText()).includes(guestOrder),
  );
  await page.fill("main input[type='search']", "Rima");
  await page.waitForTimeout(900);
  check(
    "order search by name",
    (await page.locator("main tbody").innerText()).includes(guestOrder),
  );
  await page.locator(`main a:has-text('${guestOrder}')`).first().click();
  await page.waitForSelector("main h1:has-text('Order')");
  await page.waitForTimeout(500);
  const status = () =>
    sql(
      `select status from public.orders where order_number = '${guestOrder}'`,
    );
  await page
    .locator("main button:has-text('Confirm (called the customer)')")
    .click();
  await page.fill("dialog[open] textarea", "Called, all good");
  await page.locator("dialog[open] button[type='submit']").click();
  await page.waitForTimeout(900);
  check("order confirmed", status() === "confirmed");
  await page.locator("main button:has-text('Mark packed')").click();
  await page.locator("dialog[open] button[type='submit']").click();
  await page.waitForTimeout(900);
  await page.locator("main button:has-text('Hand to courier')").click();
  await page.locator("dialog[open] input").first().fill("Steadfast");
  await page.locator("dialog[open] input").nth(1).fill("SF12345");
  await page.locator("dialog[open] button[type='submit']").click();
  await page.waitForTimeout(900);
  check(
    "handed to courier with tracking",
    sql(
      `select status || ' ' || courier_name || ' ' || tracking_code from public.orders where order_number = '${guestOrder}'`,
    ) === "handed_to_courier Steadfast SF12345",
  );
  check(
    "details can't be edited after hand-over",
    (await page.locator("main button:has-text('Edit')").count()) === 1,
  );
  await page.fill("main textarea", "Fragile, wrap well");
  await page.locator("main button:has-text('Add note')").click();
  await page.waitForTimeout(800);
  check(
    "team note saved",
    (await page.locator("main").innerText()).includes("Fragile, wrap well"),
  );
  const orderId = page.url().split("/").pop();

  // Invoice and label pages.
  const printPage = await context.newPage();
  await printPage.goto(
    new URL(`/admin/print/${orderId}?doc=invoice`, baseUrl).href,
    { waitUntil: "networkidle" },
  );
  await printPage.waitForTimeout(900);
  check(
    "invoice prints",
    (await printPage.locator("body").innerText()).includes("Invoice") &&
      (await printPage.evaluate(() => window.__printed === true)),
  );
  await printPage.goto(
    new URL(`/admin/print/${orderId}?doc=label`, baseUrl).href,
    { waitUntil: "networkidle" },
  );
  await printPage.waitForTimeout(900);
  check(
    "label shows cash to collect",
    /cash to collect/i.test(await printPage.locator("body").innerText()),
  );
  await printPage.close();

  // CSV export.
  await go(page, "/admin/orders");
  await page.waitForTimeout(600);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("main button:has-text('Export CSV')").click(),
  ]);
  const csv = await (
    await download.createReadStream()
  )
    .toArray()
    .then((c) => Buffer.concat(c).toString("utf8"));
  check(
    "CSV export has the orders",
    csv.includes(guestOrder) && csv.includes("order_number"),
  );

  // New product with two colors and a photo.
  await go(page, "/admin/products/new");
  await page.fill("main input >> nth=0", "Test linen cushion");
  await page.selectOption("main select >> nth=0", { label: "Room decor" });
  await page.locator("main button:has-text('Add an option')").click();
  for (const color of ["Sand", "Sage"]) {
    await page.fill("main input[placeholder='Add a value']", color);
    await page.keyboard.press("Enter");
  }
  await page.waitForTimeout(200);
  const rows = page.locator("main table tbody tr");
  check("variants made for each color", (await rows.count()) === 2);
  for (let i = 0; i < 2; i += 1) {
    await rows.nth(i).locator("input[aria-label^='Price']").fill("1290");
    await rows.nth(i).locator("input[aria-label^='Stock']").fill("6");
  }
  await page.locator("main button:has-text('Create product')").first().click();
  await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}$/, { timeout: 8000 });
  await page.waitForTimeout(900);
  check(
    "product saved with 2 variants",
    sql(
      "select count(*) from public.product_variants v join public.products p on p.id = v.product_id where p.name = 'Test linen cushion'",
    ) === "2",
  );
  await page.setInputFiles("main input[type='file']", "public/og-image.png");
  await page
    .waitForSelector("main img[src*='products/']", { timeout: 10000 })
    .catch(() => {});
  check(
    "photo uploaded (resized to WebP)",
    sql(
      "select count(*) || ' ' || bool_and(i.path like '%.webp') from public.product_images i join public.products p on p.id = i.product_id where p.name = 'Test linen cushion'",
    ) === "1 true",
  );
  await page.selectOption(
    "main select:has(option[value='archived'])",
    "active",
  );
  await page.locator("main button:has-text('Save product')").first().click();
  await page.waitForTimeout(1500);
  check(
    "product is active",
    sql(
      "select status from public.products where name = 'Test linen cushion'",
    ) === "active",
  );

  // Inventory correction.
  await go(page, "/admin/inventory");
  await page.waitForTimeout(800);
  await page.fill("main input[type='search']", "Test linen");
  await page.waitForTimeout(600);
  await page.locator("main button:has-text('Set stock')").first().click();
  await page.fill("dialog[open] input >> nth=0", "11");
  await page.fill("dialog[open] input >> nth=1", "Counted the shelf");
  await page.locator("dialog[open] button[type='submit']").click();
  await page.waitForTimeout(900);
  check(
    "stock corrected and logged",
    sql(
      "select count(*) from public.inventory_movements where reason = 'correction' and note = 'Counted the shelf' and stock_after = 11",
    ) === "1",
  );

  // Coupon.
  await go(page, "/admin/coupons");
  await page.locator("main button:has-text('New coupon')").click();
  await page.fill("dialog[open] input >> nth=0", "save50");
  await page.selectOption("dialog[open] select", "fixed");
  await page.fill("dialog[open] input >> nth=2", "50");
  await page.locator("dialog[open] button[type='submit']").click();
  await page.waitForTimeout(900);
  check(
    "coupon created",
    sql(
      "select type || ' ' || value from public.coupons where code = 'SAVE50'",
    ) === "fixed 50",
  );

  // Shipping fee.
  await go(page, "/admin/shipping");
  await page.waitForTimeout(800);
  await page.locator("main button[aria-label='Edit Inside Dhaka']").click();
  await page.fill("dialog[open] input >> nth=1", "90");
  await page.locator("dialog[open] button[type='submit']").click();
  await page.waitForTimeout(1200);
  check(
    "delivery fee changed, areas kept",
    sql(
      "select z.fee || ' ' || count(a.*) from public.shipping_zones z left join public.shipping_zone_areas a on a.zone_id = z.id where z.name = 'Inside Dhaka' group by z.fee",
    ) === "90 52",
  );

  // Review moderation.
  await go(page, "/admin/reviews");
  await page.waitForTimeout(800);
  await page.locator("main li button:has-text('Publish')").first().click();
  await page.waitForTimeout(900);
  check(
    "review published",
    sql("select count(*) from public.reviews where status = 'approved'") ===
      "1",
  );

  // Messages.
  sql(
    "insert into public.contact_messages (name, phone, message) values ('Nusrat', '01712345678', 'Is the lamp available in blue?')",
  );
  await go(page, "/admin/messages");
  await page.waitForTimeout(800);
  await page.locator("main button:has-text('Mark done')").first().click();
  await page.waitForTimeout(800);
  check(
    "message marked done",
    sql("select status from public.contact_messages where name = 'Nusrat'") ===
      "done",
  );

  // Settings and homepage.
  await go(page, "/admin/settings");
  await page.waitForTimeout(800);
  await page.fill(
    "main input >> nth=0",
    "Cash on Delivery · Free delivery over ৳1,000",
  );
  await page.locator("main button:has-text('Save settings')").click();
  await page.waitForTimeout(900);
  check(
    "announcement saved",
    sql("select announcement_text from public.store_settings").startsWith(
      "Cash on Delivery ·",
    ),
  );
  await page.locator("[role='tab']:has-text('Homepage')").click();
  await page.waitForTimeout(500);
  await page
    .locator("main input")
    .nth(1)
    .fill("Little *things*, lovely spaces");
  await page.locator("main button:has-text('Save homepage')").click();
  await page.waitForTimeout(900);
  check(
    "homepage hero saved",
    sql("select homepage->'hero'->>'title' from public.store_settings") ===
      "Little *things*, lovely spaces",
  );

  // Categories and collections.
  await go(page, "/admin/products/categories");
  await page.locator("main button:has-text('New category')").click();
  await page.fill("dialog[open] input >> nth=0", "Desk plants");
  await page.locator("dialog[open] button[type='submit']").click();
  await page.waitForTimeout(900);
  check(
    "category created",
    sql("select slug from public.categories where name = 'Desk plants'") ===
      "desk-plants",
  );

  await go(page, "/admin/customers");
  await page.waitForTimeout(800);
  check(
    "customers list",
    (await page.locator("main").innerText()).includes("01712345678"),
  );
  await go(page, "/admin/activity");
  await page.waitForTimeout(800);
  check("activity log", (await page.locator("main tbody tr").count()) > 3);

  // Phone layout: menu opens.
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page, "/admin");
  await page.waitForTimeout(600);
  await page.locator("button[aria-label='Open admin menu']").click();
  await page.waitForTimeout(400);
  check(
    "phone admin menu",
    await page.locator("dialog[open] a:has-text('Inventory')").isVisible(),
  );
  check("no page errors (admin)", errors.length === 0, errors.join(" | "));
  await context.close();
});

await browser.close();
console.log(`\n${results.length - failures}/${results.length} checks passed`);
if (outFile) await writeFile(outFile, JSON.stringify(results, null, 2));
process.exit(failures ? 1 : 0);
