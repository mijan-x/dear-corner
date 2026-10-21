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

await browser.close();
console.log(`\n${results.length - failures}/${results.length} checks passed`);
if (outFile) await writeFile(outFile, JSON.stringify(results, null, 2));
process.exit(failures ? 1 : 0);
